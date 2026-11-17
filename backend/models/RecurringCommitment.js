import mongoose from 'mongoose';

const recurringCommitmentSchema = new mongoose.Schema(
    {
        donor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Commitment must belong to a donor'],
            index: true
        },
        ngo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NGO',
            default: null,
            index: true
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true
        },
        itemName: {
            type: String,
            required: [true, 'Item name/description is required'],
            trim: true
        },
        quantity: {
            type: Number,
            required: [true, 'Pledge quantity is required'],
            min: [1, 'Quantity must be at least 1']
        },
        unit: {
            type: String,
            default: 'items',
            trim: true
        },
        frequency: {
            type: String,
            enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
            default: 'monthly'
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        nextPledgeDate: {
            type: Date,
            required: true,
            index: true
        },
        notes: {
            type: String,
            default: '',
            trim: true
        },
        status: {
            type: String,
            enum: ['active', 'paused', 'cancelled', 'completed'],
            default: 'active',
            index: true
        },
        fulfilledDonationsCount: {
            type: Number,
            default: 0
        },
        lastFulfilledAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

recurringCommitmentSchema.index({ donor: 1, status: 1 });
recurringCommitmentSchema.index({ nextPledgeDate: 1, status: 1 });

const RecurringCommitment = mongoose.model('RecurringCommitment', recurringCommitmentSchema);
export default RecurringCommitment;
