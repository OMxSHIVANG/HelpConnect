import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
    {
        ngo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NGO',
            required: [true, 'Campaign must be organized by an NGO'],
            index: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        title: {
            type: String,
            required: [true, 'Campaign title is required'],
            trim: true,
            maxlength: [200, 'Campaign title cannot exceed 200 characters']
        },
        description: {
            type: String,
            required: [true, 'Campaign description is required'],
            trim: true
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
            default: 'General'
        },
        targetQuantity: {
            type: Number,
            required: [true, 'Target quantity is required'],
            min: [1, 'Target quantity must be at least 1']
        },
        unit: {
            type: String,
            default: 'items',
            trim: true
        },
        // Received quantity MUST be computed strictly from verified completed contributions
        receivedQuantity: {
            type: Number,
            default: 0,
            min: [0, 'Received quantity cannot be negative']
        },
        coverImage: {
            type: String,
            default: ''
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: {
            type: Date,
            required: [true, 'Campaign end date is required']
        },
        location: {
            type: String,
            default: '',
            trim: true
        },
        city: {
            type: String,
            default: '',
            trim: true
        },
        urgency: {
            type: String,
            enum: ['Low', 'Normal', 'Medium', 'High', 'Critical'],
            default: 'High'
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'cancelled', 'draft'],
            default: 'active',
            index: true
        },
        completionReport: {
            summary: { type: String, default: '' },
            distributedDate: { type: Date, default: null },
            evidenceImages: [{ type: String }],
            beneficiariesCount: { type: Number, default: 0 },
            reportedAt: { type: Date, default: null }
        }
    },
    {
        timestamps: true
    }
);

campaignSchema.index({ status: 1, category: 1, city: 1 });
campaignSchema.index({ ngo: 1, status: 1 });
campaignSchema.index({ createdAt: -1 });

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;
