import os
import re
import shutil

# ---------- CONFIG ----------
ROOT_DIR = "."
BACKUP_DIR = "_comment_backup"
SUPPORTED_EXT = {".js", ".css", ".html"}

COMMENT_PATTERNS = {
    ".js": [
        re.compile(r"//.*?$", re.MULTILINE),
        re.compile(r"/\*[\s\S]*?\*/")
    ],
    ".css": [
        re.compile(r"/\*[\s\S]*?\*/")
    ],
    ".html": [
        re.compile(r"<!--[\s\S]*?-->")
    ]
}
# ----------------------------


def backup_file(filepath):
    backup_path = os.path.join(BACKUP_DIR, filepath)
    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
    shutil.copy2(filepath, backup_path)


def process_file(filepath):
    ext = os.path.splitext(filepath)[1]
    if ext not in SUPPORTED_EXT:
        return

    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    patterns = COMMENT_PATTERNS.get(ext, [])
    if not patterns:
        return

    original_content = content
    modified = False

    for pattern in patterns:
        while True:
            match = pattern.search(content)
            if not match:
                break

            comment = match.group()
            print("\n" + "=" * 80)
            print(f"FILE: {filepath}")
            print("COMMENT FOUND:\n")
            print(comment.strip())
            print()

            choice = input("Delete this comment? [Y/n]: ").strip().lower()

            # DEFAULT = YES
            if choice in ("n", "no"):
                print("⏭ Kept.")
                # Skip this one, move cursor forward
                start = match.end()
                content = content[:start]
                continue

            # Delete comment
            content = content[:match.start()] + content[match.end():]
            modified = True
            print("✔ Deleted.")

    if modified:
        backup_file(filepath)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)


def main():
    print("🔍 Scanning project...")
    print("⚠️ Press Enter to DELETE, type 'n' to KEEP")
    print("📁 Backup folder:", BACKUP_DIR)

    for root, _, files in os.walk(ROOT_DIR):
        if BACKUP_DIR in root:
            continue

        for file in files:
            process_file(os.path.join(root, file))

    print("\n✅ Finished.")


if __name__ == "__main__":
    main()
