const express = require("express");
const router = express.Router();

const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const shortid = require("shortid");
const path = require("path");

const { uploadProfileToS3, getFile, deleteProfileUrl } = require("../s3");
const { Vendor } = require("../models/vendor");
const { User } = require("../models/user");
require("dotenv/config");

const fs = require("fs");

const FILE_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/jpg": "jpg",
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error(
            "이미지 파일은 .png, .jpeg, .jpg만 가능합니다."
        );
        if (isValid) {
            uploadError = null;
        }

        const uploadsFolder = path.join(path.dirname(__dirname), "uploads");
        if (!fs.existsSync(uploadsFolder)) {
            fs.mkdirSync(uploadsFolder);
        }

        cb(uploadError, uploadsFolder);
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(" ").join("-");
        cb(null, shortid.generate() + "-" + fileName);
    },
});

const upload = multer({ storage });

router.post(`/create`, upload.array("image", 2), async (req, res) => {
    const {
        brandName,
        email,
        phone,
        bankName,
        bankAccount,
        bankOwner,
        submitted,
        userId,
    } = req.body;

    try {
        const images = req.files.map((file) => ({
            file: fs.readFileSync(file.path),
        }));

        const imageUploadPromises = images.map((image) =>
            uploadProfileToS3(image)
        );

        const uploadedImages = await Promise.all(imageUploadPromises);

        const imageUrls = uploadedImages.map((result) => result.key);
        let vendor = new Vendor({
            document: imageUrls[1],
            brandName,
            email,
            phone,
            bankName,
            bankAccount,
            bankOwner,
            userId,
            submitted: submitted || true,
        });

        vendor = await vendor.save();

        if (!vendor) {
            return res.status(500).send("사업자를 생성할 수 없습니다");
        }

        const user = await User.findById(userId);
        user.$ignore = ["passwordHash", "email"];
        if (user) {
            user.image = imageUrls[0];
            user.brand = brandName;
            user.phone = phone;
            user.submitted = true;
            user.followers = {};
            user.following = {};
            user.likes = {};
            user.role = "admin";
            await user.save({ validateBeforeSave: false });
        }

        res.status(201).json({ vendor });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Server error adding product" });
    }
});


// multipart/form-data

// Page 1: General Information
router.patch('/general', upload.single("image"), async (req, res ) => {

    let imageUrl = null;
    if (!req?.file) {
      console.log("profile image upload: no file");
      return null;
    }
    try {
        const { brand, link, name, brandDescription, username } = req.body;
        const userId = req.user.userId; 
        const image = req.file ? { file: fs.readFileSync(req.file.path) } : null;
        if (image) {
          const uploadedImage = await uploadProfileToS3(image);
          imageUrl = uploadedImage.key;
        } else {
          console.log("no image");
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                brand,
                brandDescription,
                image:imageUrl,
                link,
                name,
                username,
            },
            { new: true }
        );
        console.log('updated user',{userId,success:true})
        res.status(200).json({ user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error updating vendor' });
    }
});

// Page 2: Managers

// Page 3: Delivery Address


module.exports = router;
