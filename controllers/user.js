const {User} = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.getUsers = async (req, res) => {
    const userList = await User.find().select('-passwordHash');

    if(!userList){
        res.status(500).json({success:false});
    }
    res.status(200).send(userList);
}

exports.getUserId = async (req, res) => {
    const user = await User.findById(req.params.id).select('-passwordHash');

    if(!user){
        res.status(500).json({message:'The user with the given ID was not found'})
    }
    res.status(200).send(user);
}

exports.postNewUser = async (req, res) => {
    let user = new User({
        name: req.body.name,
        username: req.body.username,
        email: req.body.email,
        street: req.body.street,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
        image: req.body.image,
        role: req.body.role,
        brand: req.body.brand,
        brandDescription: req.body.brandDescription,
        followers: [],
        following: [],
        savedVideos: [],
        savedProducts: [],
        videos: []
    })
    user = await user.save();

    if(!user)
    return res.status(400).send('the user cannot be created!')
    
    res.send(user);
}

exports.updateUser = async (req, res)=> {
    const userExist = await User.findById(req.params.id);
    let newPassword
    if(req.body.password) {
        newPassword = bcrypt.hashSync(req.body.password, 10)
    } else {
        newPassword = userExist.passwordHash;
    }

    const user = await User.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            username: req.body.username,
            email: req.body.email,
            passwordHash: newPassword,
            phone: req.body.phone,
            isAdmin: req.body.isAdmin,
            street: req.body.street,
            apartment: req.body.apartment,
            zip: req.body.zip,
            city: req.body.city,
            country: req.body.country,
            role: req.body.role,
            brand: req.body.brand,
            brandDescription: req.body.brandDescription,
            followers: req.body.followers,
            following: req.body.following,
            savedVideos: req.body.savedVideos,
            savedProducts: req.body.savedProducts,
            videos: req.body.videos,
        },
        { new: true}
    )

    if(!user)
    return res.status(400).send('the user cannot be created!')

    res.send(user);
}

exports.deleteUser = (req, res) => {
    User.findByIdAndRemove(req.params.id).then(user =>{
        if(user){
            return res.status(200).json({success:true, message:'the user is deleted'})
        } else {
            return res.status(404).json({success:false, message: "user not found"})
        }
    }).catch(err=>{
        return res.status(400).json({success: false, error: err})
    })
}

exports.register = async (req, res) => {

    const registerUser = await User.findOne({ email: req.body.email});
    if(registerUser)
    return res.status(400).json({
        message: '이미 등록된 이메일 주소입니다.'
    });

    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
        role: req.body.role,
        brand: req.body.brand,
        brandDescription: req.body.brandDescription,
    })
    user = await user.save();

    if(!user)
    return res.status(400).send('the user cannot be created!')

    res.send(user);
}

exports.login = async (req, res) => {
    const user = await User.findOne({email: req.body.email})
    const secret = process.env.secret;
    if(!user) {
        return res.status(400).send('The user not found');
    }

    if(user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user.id,
                isAdmin: user.isAdmin
            },
            secret,
            {expiresIn : '1d'}
        )
        const { _id, email, role, name, isAdmin, image} = user;
        res.status(200).json({
            token,
            user: { _id, email, role, name, isAdmin, image }
        })
        // res.status(200).send({user: user.email , token: token}) 
    } else {
       res.status(400).send('password is wrong!');
    }
   
}

exports.getUserCount = async (req, res) => {
    const userCount = await User.countDocuments();

    if (!userCount) {
        res.status(500).json({ success: false });
    }
    res.send({
        userCount: userCount,
    });
}

exports.followUser = async (req, res) => {
    try {
        const user = await User.find({_id: req.params.id, followers: req.user._id})
        if(user.length > 0) return res.status(500).json({msg: "You followed this user."})

        const newUser = await Users.findOneAndUpdate({_id: req.params.id}, { 
            $push: {followers: req.user._id}
        }, {new: true}).populate("followers following", "-password")

        await User.findOneAndUpdate({_id: req.user._id}, {
            $push: {following: req.params.id}
        }, {new: true})

        res.json({newUser})

    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
}

exports.unfollowUser = async (req, res) => {
    try {
        const newUser = await User.findOneAndUpdate({_id: req.params.id}, { 
            $pull: {followers: req.user._id}
        }, {new: true}).populate("followers following", "-password")

        await User.findOneAndUpdate({_id: req.user._id}, {
            $pull: {following: req.params.id}
        }, {new: true})

        res.json({newUser})

    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
}