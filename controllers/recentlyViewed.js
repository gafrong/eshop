const {RecentlyViewed} = require('../models/recentlyViewed');
const slugify = require('slugify');


exports.getRecentlyViewed = async (req, res) => {
    console.log('req params', req.params.id);
    const userId = mongoose.Types.ObjectId(req.params.id);
    const recentlyViewedList = await RecentlyViewed.find({user: userId});

    if(!recentlyViewedList){
        res.status(500).json({success:false})
    }
    res.status(200).send(recentlyViewedList);
}

exports.saveRecentlyViewed = async (req, res) => {
    const { userId, productId } = req.body;
    console.log('check req body', req.body);
    let recentlyViewed = new RecentlyViewed({ user:userId, product:productId });

    recentlyViewed = await recentlyViewed.save();
    
    if(!recentlyViewed)
    return res.status(404).send('상품을 저장할 수 없습니다.')

    res.send(recentlyViewed);
}

exports.deleteRecentlyViewed = async (req, res) => {
    try {
        const recentlyViewed = await RecentlyViewed.findById(req.params.id);
        if (!recentlyViewed) {
            return res.status(404).json({ error: 'Product not found' });
        }
  
        await recentlyViewed.remove();
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getProductsByCategoryId = async (req, res) => {
    console.log('req.params.', req.params.categoryId)
    try {
        const categoryId = mongoose.Types.ObjectId(req.params.categoryId);
        const products = await Product.find({ parentCategory: categoryId});

        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({error: 'Failed to retrieve category products'});
    }
}