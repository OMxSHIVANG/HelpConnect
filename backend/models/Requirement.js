import mongoose from 'mongoose';

const requirementSchema = new mongoose.Schema(
    {
        ngo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NGO',
            required: [true, 'Requirement must be associated with an NGO']
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Requirement must be created by an authenticated user']
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters']
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
            default: 'Other'
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1']
        },
        unit: {
            type: String,
            default: 'pieces',
            trim: true
        },
        remainingQuantity: {
            type: Number,
            required: true,
            min: [0, 'Remaining quantity cannot be negative']
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true
        },
        urgency: {
            type: String,
            enum: ['Low', 'Normal', 'Medium', 'High', 'Critical'],
            default: 'Medium'
        },
        deadline: {
            type: Date,
            default: null
        },
        image: {
            type: String,
            default: ''
        },
        clothesType: {
            type: String,
            default: '',
            trim: true
        },
        targetAgeGroup: {
            type: String,
            default: '',
            trim: true
        },
        size: {
            type: String,
            default: '',
            trim: true
        },
        bookClass: {
            type: String,
            default: '',
            trim: true
        },
        bookType: {
            type: String,
            default: '',
            trim: true
        },
        bookName: {
            type: String,
            default: '',
            trim: true
        },
        foodType: {
            type: String,
            default: '',
            trim: true
        },
        electronicType: {
            type: String,
            default: '',
            trim: true
        },
        medicineType: {
            type: String,
            default: '',
            trim: true
        },
        customItems: {
            type: String,
            default: '',
            trim: true
        },
        campaign: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Campaign',
            default: null,
            index: true
        },
        isGroupDonation: {
            type: Boolean,
            default: false,
            index: true
        },
        groupTarget: {
            type: Number,
            default: 0
        },
        contributorsCount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['active', 'fulfilled', 'cancelled'],
            default: 'active'
        }
    },
    {
        timestamps: true
    }
);

requirementSchema.index({ status: 1, category: 1, city: 1 });
requirementSchema.index({ ngo: 1, status: 1 });
requirementSchema.index({ createdAt: -1 });

const Requirement = mongoose.model('Requirement', requirementSchema);
export default Requirement;
