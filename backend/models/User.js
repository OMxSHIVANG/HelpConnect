import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters']
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [emailRegex, 'Please provide a valid email address']
        },
        password: {
            type: String,
            required: false,
            minlength: [6, 'Password must be at least 6 characters']
        },
        googleId: {
            type: String,
            default: null,
            sparse: true
        },
        avatar: {
            type: String,
            default: ''
        },
        phone: {
            type: String,
            default: '',
            trim: true
        },
        location: {
            type: String,
            default: '',
            trim: true
        },
        role: {
            type: String,
            enum: {
                values: ['user', 'ngo', 'admin'],
                message: '{VALUE} is not a valid user role'
            },
            default: 'user'
        },
        username: { type: String, default: '', trim: true },
        gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
        dateOfBirth: { type: Date, default: null },
        address: { type: String, default: '', trim: true },
        city: { type: String, default: '', trim: true },
        state: { type: String, default: '', trim: true },
        pincode: { type: String, default: '', trim: true },
        bio: { type: String, default: '', trim: true, maxlength: [500, 'Bio cannot exceed 500 characters'] },
        isActive: { type: Boolean, default: true },
        isEmailVerified: { type: Boolean, default: false },
        emailVerifiedAt: { type: Date, default: null },
        emailVerificationOtp: { type: String, default: null, select: false },
        emailVerificationOtpExpires: { type: Date, default: null, select: false },
        impactPrivacy: {
            isPublic: { type: Boolean, default: true },
            showStats: { type: Boolean, default: true },
            showBadges: { type: Boolean, default: true },
            showTimeline: { type: Boolean, default: true }
        }
    },
    {
        timestamps: true
    }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password || !enteredPassword) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
