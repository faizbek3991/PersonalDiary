const Diary = require('../models/Diary');
const mongoose = require('mongoose');


// UPDATE CREATE
const createDiary = async (req, res) => {

    try {

        const diary = await Diary.create({

            user: req.user._id,

            title: req.body.title,

            content: req.body.content,

            mood: req.body.mood
        });

        return res.status(201).json(diary);

    } catch (error) {

        return res.status(500).json({
            message: error.message
        });
    }
};

// READ ALL
const getDiaries = async (req, res) => {

    try {

        const diaries = await Diary.find({

            user: req.user._id

        }).sort({ createdAt: -1 });

        return res.json(diaries);

    } catch (error) {

        return res.status(500).json({
            message: error.message
        });
    }
};

// READ SINGLE
const getDiaryById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid diary ID format'
            });
        }


        const diary = await Diary.findById(req.params.id);

        if (!diary) {
            return res.status(404).json({
                message: 'Diary not found'
            });
        }

        // CHECK OWNER
        if (
            diary.user.toString() !==
            req.user._id.toString()
        ) {

            return res.status(401).json({
                message: 'Not authorized'
            });
        }

        return res.json(diary);

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};


// UPDATE
const updateDiary = async (req, res) => {

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid diary ID format'
            });
        }


        const diary = await Diary.findById(req.params.id);

        if (!diary) {

            return res.status(404).json({
                message: 'Diary not found'
            });
        }

        // CHECK OWNER
        if (
            diary.user.toString() !==
            req.user._id.toString()
        ) {

            return res.status(401).json({
                message: 'Not authorized'
            });
        }

        diary.title = req.body.title;
        diary.content = req.body.content;
        diary.mood = req.body.mood;

        const updatedDiary = await diary.save();

        return res.json(updatedDiary);

    } catch (error) {

        return res.status(500).json({
            message: error.message
        });
    }
};
// DELETE
const deleteDiary = async (req, res) => {

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid diary ID format'
            });
        }


        const diary = await Diary.findById(req.params.id);

        if (!diary) {

            return res.status(404).json({
                message: 'Diary not found'
            });
        }

        // CHECK OWNER
        if (
            diary.user.toString() !==
            req.user._id.toString()
        ) {

            return res.status(401).json({
                message: 'Not authorized'
            });
        }

        await diary.deleteOne();

        return res.json({
            message: 'Diary deleted'
        });

    } catch (error) {

        return res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    createDiary,
    getDiaries,
    getDiaryById,
    updateDiary,
    deleteDiary
};
