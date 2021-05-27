const express = require('express');
const User = require('../models/user');
const auth = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');

const router = new express.Router();

// Sign Up
router.post('/users/add', async (req, res) => {
    try {
        const user = new User(req.body);
        user.name = user.name.toLowerCase();
        await user.save();
        const token = await user.generateAuthToken();
        res.status(201).send({ user, token });
    } catch (error) {
        res.status(500).send(error);
    }
})

// Sign In
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCred(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        res.send({ user, token });

    } catch (error) {
        res.status(400).send({ error: error.message });
    }
})

// Logout from one device
router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter(token => token.token != req.token);
        await req.user.save();
        res.send();
    } catch (error) {
        res.status(500).send();
    }
})

// Logout from all devices
router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();
        res.send();
    } catch (error) {
        res.status(500).send();
    }
})

// See my profile
router.get('/users/me', auth, async (req, res) => {
    res.send(req.user);
})

// See others' profile
router.get('/users/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send({
                error: "User not found"
            });
        }

        const publicUser = user.getPublicProfile();
        res.send(publicUser);

    } catch (error) {
        res.status(500).send(error)
    }
})

// Update my profile details except password
router.patch('/users/modify/me', auth, async (req, res) => {
    try {
        const canUpdate = ['name', 'email', 'avatar'];
        const validUpdates = Object.keys(req.body).every(update => canUpdate.includes(update));

        if (!validUpdates) {
            return res.send({
                error: "Invalid update parameters!"
            })
        }

        Object.keys(req.body).forEach(update => {
            req.user[update] = req.body[update];
        })
        await req.user.save();
        res.send(req.user);

    } catch (e) {
        res.status(500).send(e);
    }
})

// delete profile
router.delete('/users/remove/me', auth, async (req, res) => {
    try {
        await req.user.remove();
        res.send(req.user);
    } catch (error) {
        res.status(500).send(error);
    }
})

// Upload my profile picture
const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|png|jpeg|webp)$/)) {
            return cb(new Error("Supported image formats are jpg,png,jpeg and webp"));
        }
        cb(undefined, true);
    }
})

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        const buffer = await sharp(req.file.buffer).resize({
            width: 250,
            height: 250
        }).png().toBuffer();

        req.user.avatar = buffer;
        await req.user.save();
        res.send();

    } catch (error) {
        res.status(500).send("Internal Server Error !");
    }

}, (error, req, res, next) => {
    res.send({
        error: error.message
    })
})

// Upload through D&D
const dnd = multer();

router.post('/users/me/avatar/drop', auth, dnd.single('avatar-drop'), async (req, res) => {
    try {
        const buffer = await sharp(req.file.buffer).resize({
            width: 250,
            height: 250
        }).png().toBuffer();

        req.user.avatar = buffer;
        await req.user.save();
        res.send();

    } catch (error) {
        res.status(500).send({
            error: "Internal Server Error !",
        });
    }
})

// See profile pics through id
router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || !user.avatar) {
            throw new Error("Either no avatar or user non-existent");
        }

        res.set('Content-Type', 'image/png');
        res.send(user.avatar);

    } catch (error) {
        res.send({
            error: error.message
        })
    }
})

// Deleting the profile picture
router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined;
    await req.user.save();
    res.send();
})

// Searching users
router.get('/users', auth, async (req, res) => {
    try {
        const name = req.query.name.toLowerCase();
        if (!req.query.name) {
            return res.status(404).send();
        }

        let users = await User.find({
            name: { '$regex': name }
        }, {}, {
            limit: 5,
            skip: 0 || Number(req.query.skip)
        });

        if (!users) {
            users = [];
        }
        res.send(users);

    } catch (error) {
        res.status(500).send(error);
    }
});

// Adding a bio
router.post('/users/me/about', auth, async (req,res) => {
    try{
        const about = req.body.about;
        req.user.about = about;
        await req.user.save();

        res.send();

    } catch (error) {
        res.status(500).send({
            error : "Internal Server Error !"
        });
    }
})

module.exports = router;
