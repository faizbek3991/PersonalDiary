const express = require('express');

const router = express.Router();

const {
    createDiary,
    getDiaries,
    getDiaryById,
    updateDiary,
    deleteDiary
} = require('../controllers/diaryController');


// CREATE
router.post('/', createDiary);

// READ ALL
router.get('/', getDiaries);

// READ SINGLE
router.get('/:id', getDiaryById);

// UPDATE
router.put('/:id', updateDiary);

// DELETE
router.delete('/:id', deleteDiary);

module.exports = router;