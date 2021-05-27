const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Post = require('../models/post');

const userSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
        trim : true
    },
    email : {
        type : String,
        required : true,
        trim : true,
        unique : true,
        lowercase : true,
        validate (value) {
            if (!validator.isEmail(value)) {
                throw new Error("Enter a valid E-Mail")
            }
        }
    },
    password : {
        type : String,
        required : true,
        minLength : 8
    },
    tokens : [{
        token : {
            type : String,
            required : true
        }
    }],
    avatar : {
        type : Buffer
    },
    countPosts : {
        type : Number,
        default : 0
    },
    liked : [{
        post : {
            type : mongoose.Schema.Types.ObjectId
        }
    }],
    about : {
        type : String,
        default : ""
    }
},{
    timestamps : true
})

userSchema.virtual('posts',{
    ref : 'Post',
    localField : '_id',
    foreignField : 'owner'
})

userSchema.methods.generateAuthToken = async function() {
    const user = this;
    const token = jwt.sign({_id : user._id.toString()},process.env.JSON_SECRET);
    user.tokens = user.tokens.concat({token});
    await user.save();
    return token;
}

userSchema.methods.toJSON = function () {
    const user = this;
    const userObj = user.toObject();

    delete userObj.password;
    delete userObj.tokens;
    delete userObj.avatar;

    return userObj;
}

userSchema.methods.getPublicProfile = function () {
    const user = this;
    const userObj = user.toObject();

    delete userObj.password;
    delete userObj.tokens;
    delete userObj.email;
    delete userObj.createdAt;
    delete userObj.updatedAt;
    delete userObj.avatar;

    return userObj;
}

userSchema.statics.findByCred = async (email,password) => {
    const user = await User.findOne({email});
    if (!user) {
        throw new Error("User not found!");
    }

    const passwordCorrect = await bcrypt.compare(password,user.password);
    if (!passwordCorrect) {
        throw new Error("Enter correct password!");
    }

    return user;
}

userSchema.pre('save', async function (next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }

    next();
})

userSchema.pre('remove', async function (next) {
    const user = this;
    await Post.deleteMany({owner : user._id});
    next();
})

const User = mongoose.model('User',userSchema);
module.exports = User;