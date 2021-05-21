const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    heading : {
        type : String,
        required : true,
        trim : true
    },
    content : {
        type : String,
        trim : true
    },
    picture : {
        type : Buffer
    },
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    likes : {
        type : Number,
        required : true,
        default : 0
    }
},{
    timestamps : true
});

postSchema.methods.toJSON = function () {
    const post = this;
    const postObj = post.toObject();

    delete postObj.picture;

    return postObj;
}

const Post = mongoose.model('Post',postSchema);
module.exports = Post;