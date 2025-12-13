const mongoose = require("mongoose");

const bannedUserSchema = new mongoose.Schema({
    originalUserId: String,
    user: {
        type: Object,
        default: {}
    },
    reason: {
        type: String,
        required: true
    },
    bannedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: null
    },
    banType: {
        type: String,
        enum: ['temporary', 'permanent'],
        default: 'permanent'
    },
    bannedBy: {
        type: String,
        default: 'admin'
    },
    comments: {
        type: [Object],
        default: []
    },
    carts: {
        type: [Object],
        default: []
    },
    orders: {
        type: [Object],
        default: []
    },
    appealStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', null],
        default: null
    },
    appealMessage: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("BannedUser", bannedUserSchema);
