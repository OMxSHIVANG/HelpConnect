import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ALLOWED_VEHICLE_TYPES = [
    'Bike',
    'Scooter',
    'Car',
    'Auto Rickshaw',
    'Auto',
    'Van',
    'Mini Truck',
    'Truck',
    'Other'
];

const pickupAgentSchema = new mongoose.Schema(
    {
        ngoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NGO',
            required: [true, 'NGO reference is required'],
            index: true
        },
        agentId: {
            type: String,
            default: () => 'AGT-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
            required: [true, 'Agent ID is required'],
            unique: true,
            uppercase: true,
            trim: true,
            index: true
        },
        fullName: {
            type: String,
            required: [true, 'Agent full name is required'],
            minlength: [2, 'Agent full name must be at least 2 characters long'],
            maxlength: [100, 'Agent full name cannot exceed 100 characters'],
            trim: true
        },
        profilePhoto: {
            type: String,
            default: '',
            trim: true
        },
        phone: {
            type: String,
            required: [true, 'Mobile number is required'],
            trim: true,
            validate: {
                validator: function (v) {
                    return /^\+?[0-9]{10,15}$/.test(v ? v.replace(/[\s-]/g, '') : '');
                },
                message: 'Please enter a valid 10 to 15 digit mobile number'
            }
        },
        vehicleType: {
            type: String,
            required: [true, 'Vehicle type is required'],
            enum: {
                values: ALLOWED_VEHICLE_TYPES,
                message: '{VALUE} is not a valid vehicle type'
            },
            trim: true
        },
        vehicleNumber: {
            type: String,
            required: [true, 'Vehicle registration number is required'],
            minlength: [4, 'Vehicle registration number must be at least 4 characters'],
            maxlength: [25, 'Vehicle registration number cannot exceed 25 characters'],
            uppercase: true,
            trim: true
        },
        address: {
            type: String,
            default: '',
            maxlength: [250, 'Address cannot exceed 250 characters'],
            trim: true
        },
        additionalDetails: {
            type: String,
            default: '',
            maxlength: [500, 'Additional details cannot exceed 500 characters'],
            trim: true
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            index: true
        },
        password: {
            type: String,
            select: false,
            minlength: [6, 'Password must be at least 6 characters']
        },
        isActivated: {
            type: Boolean,
            default: false,
            index: true
        },
        activationToken: {
            type: String,
            default: () => crypto.randomBytes(24).toString('hex'),
            index: true
        },
        activationTokenExpires: {
            type: Date,
            default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        activatedAt: {
            type: Date,
            default: null
        },
        currentLocation: {
            latitude: { type: Number, default: null },
            longitude: { type: Number, default: null },
            updatedAt: { type: Date, default: null }
        }
    },
    {
        timestamps: true
    }
);

pickupAgentSchema.index({ ngoId: 1, status: 1 });

pickupAgentSchema.pre('validate', function () {
    if (!this.agentId) {
        this.agentId = 'AGT-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    }
    if (this.vehicleNumber) {
        this.vehicleNumber = this.vehicleNumber.trim().toUpperCase();
    }
});

// Encrypt password before saving
pickupAgentSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next ? next() : undefined;
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        if (next) next();
    } catch (err) {
        if (next) next(err);
        else throw err;
    }
});

// Compare password method
pickupAgentSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password || !enteredPassword) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

const PickupAgent = mongoose.model('PickupAgent', pickupAgentSchema);
export default PickupAgent;
