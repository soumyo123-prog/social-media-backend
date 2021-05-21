const express = require('express');
const Post = require('../models/post');
const User = require('../models/user');
const auth = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');

const router = new express.Router();

// Add Post 
router.post('/posts/add',auth,async (req,res) => {
    try{
        const post = new Post({
            ...req.body,
            owner : req.user._id
        });
        await post.save();

        req.user.countPosts += 1;
        await req.user.save();

        res.status(201).send(post);

    } catch (error) {
        res.status(500).send(error);
    }
});

// Add post picture
const upload = multer({
    fileFilter (req,file,cb) {
        if (!file.originalname.match(/\.(jpg|png|jpeg|webp)/)) {
            return cb(new Error("File format not supported!"));
        }
        cb(undefined,true);
    }
})

router.post('/posts/image/:id',auth,upload.single('post'),async (req,res) => {
    try{
        if (!req.file) {
            return res.send();
        }

        const buffer = await sharp(req.file.buffer).resize({
            width : 250,
            height : 250
        }).png().toBuffer();

        const post = await Post.findById(req.params.id);
        if (post.owner != req.user.id) {
            throw new Error("This post does not belong to the logged in USER !");
        }

        post.picture = buffer;
        await post.save();
        res.send();

    } catch(e) {
        res.send({
            error : e.message
        })
    }

},(error,req,res,next) => {
    res.send({
        error : error.message
    })
})

// View Post picture
router.get('/posts/image/:id',async (req,res) => {
    try{
        const post = await Post.findById(req.params.id);
        if (!post || !post.picture) {
            throw new Error('Either post not available or image not uploaded !');    
        }

        res.set('Content-Type','image/png');
        res.send(post.picture);

    } catch(error) {
        res.send({
            error : error.message
        })
    }
})

// View my posts
router.get('/posts/me/all',auth,async (req,res) => {
    try {
        await req.user.populate({
            path : 'posts',
            options : {
                limit : 5,
                skip : Number(req.query.skip)
            }
        }).execPopulate();
        res.send(req.user.posts);

    } catch (error) {
        res.status(500).send(error);
    }
})

// View others' posts
router.get('/posts/:id/all',auth,async (req,res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send({
                error : "User not found!"
            })
        }
        await user.populate({
            path : 'posts',
            options : {
                limit : 5,
                skip : 0 || Number(req.query.skip)
            }
        }).execPopulate();
        res.send(user.posts);

    } catch (error) {
        res.status(500).send(error);
    }
})

// View a single post by ID
router.get('/posts/:id',auth,async (req,res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).send();
        }
        res.send(post);

    } catch (error) {
        res.status(500).send();
    }
})

// Delete my post by id
router.delete('/posts/remove/:id',auth,async (req,res) => {
    try {
        const post = await Post.findOneAndDelete({
            _id : req.params.id,
            owner : req.user.id
        });

        if (!post) {
            return res.status(404).send({
                error : "Post not found!"
            })
        }
        req.user.countPosts -= 1;
        req.user.liked = req.user.liked.filter(post => post.post != req.params.id);
        await req.user.save();
        
        res.send(post);

    } catch (error) {
        res.status(500).send(error);
    }
})

// Update likes
router.patch('/posts/:id/likes', auth, async (req,res) => {
    try {
        const post = await Post.findById(req.params.id)
        if (!post) {
            return res.status(404).send();
        }

        if (req.query.type == '1') {
            let likeable = req.user.liked.every(post => post.post != req.params.id);
            if (likeable) {
                post.likes = post.likes + 1;
                await post.save();

                req.user.liked = req.user.liked.concat({post : req.params.id});
                await req.user.save();
            }
        } else if (req.query.type == '0') {
            let possible = false;

            req.user.liked.forEach(post => {
                if (post.post == req.params.id) {
                    possible = true;
                    return;
                }
            })

            if (possible) {
                post.likes = post.likes - 1;
                await post.save();

                req.user.liked = req.user.liked.filter(post => post.post != req.params.id)
                await req.user.save();
            }
        }

        res.send(req.user);

    } catch (error) {
        res.status(500).send({
            error : "Internal Server Error !"
        })
    }
})

module.exports = router;
