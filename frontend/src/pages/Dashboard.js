import React, {
    useCallback,
    useEffect,
    useState
} from 'react';

import axios from 'axios';

import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';

function Dashboard() {

    const navigate = useNavigate();

    const [diaries, setDiaries] = useState([]);

    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({

        title: '',
        content: '',
        mood: ''
    });


    // GET TOKEN
    const token = localStorage.getItem('token');


    // LOAD DIARIES
    const fetchDiaries = useCallback(async () => {

        try {

            const res = await axios.get(

                `${API_BASE_URL}/diaries`,

                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setDiaries(res.data);

        } catch (error) {

            console.log(error);
        }
    }, [token]);


    useEffect(() => {

        if (!token) {

            navigate('/');

        } else {

            fetchDiaries();
        }

    }, [fetchDiaries, navigate, token]);

    // INPUT CHANGE
    function handleChange(e) {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    }


    // CREATE OR UPDATE
    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            // UPDATE
            if (editingId) {

                await axios.put(

                    `${API_BASE_URL}/diaries/${editingId}`,

                    formData,

                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                alert('Diary Updated');

                setEditingId(null);

            } else {

                // CREATE
                await axios.post(

                    `${API_BASE_URL}/diaries`,

                    formData,

                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                alert('Diary Created');
            }

            setFormData({
                title: '',
                content: '',
                mood: ''
            });

            fetchDiaries();

        } catch (error) {

            alert(error.response.data.message);
        }
    };


    // DELETE
    const deleteDiary = async (id) => {

        try {

            await axios.delete(

                `${API_BASE_URL}/diaries/${id}`,

                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            alert('Diary Deleted');

            fetchDiaries();

        } catch (error) {

            console.log(error);
        }
    };


    // EDIT
    const editDiary = (diary) => {

        setEditingId(diary._id);

        setFormData({

            title: diary.title,
            content: diary.content,
            mood: diary.mood
        });
    };


    // LOGOUT
    const logout = () => {

        localStorage.removeItem('token');

        navigate('/');
    };


    return (

        <div className="dashboard">

            <div className="topbar">

                <h2>My Diaries</h2>

                <button
                    className="logout-btn"
                    onClick={logout}
                >
                    Logout
                </button>

            </div>


            {/* FORM */}
            <form
                className="form"
                onSubmit={handleSubmit}
            >

                <h1>

                    {editingId
                        ? 'Edit Diary'
                        : 'Create Diary'}

                </h1>

                <input
                    type="text"
                    name="title"
                    placeholder="Title"
                    value={formData.title}
                    onChange={handleChange}
                />

                <textarea
                    name="content"
                    placeholder="Write diary..."
                    rows="5"
                    value={formData.content}
                    onChange={handleChange}
                />

                <input
                    type="text"
                    name="mood"
                    placeholder="Mood"
                    value={formData.mood}
                    onChange={handleChange}
                />

                <button type="submit">

                    {editingId
                        ? 'Update Diary'
                        : 'Save Diary'}

                </button>

            </form>


            {/* DIARY LIST */}
            <div className="diary-list">

                {
                    diaries.map((diary) => (

                        <div
                            className="diary-card"
                            key={diary._id}
                        >

                            <h3>{diary.title}</h3>

                            <p>{diary.content}</p>

                            <small>
                                Mood: {diary.mood}
                            </small>

                            <div className="btn-group">

                                <button
                                    onClick={() =>
                                        editDiary(diary)
                                    }
                                >
                                    Edit
                                </button>

                                <button
                                    onClick={() =>
                                        deleteDiary(diary._id)
                                    }
                                >
                                    Delete
                                </button>

                            </div>

                        </div>
                    ))
                }

            </div>

        </div>
    );
}

export default Dashboard;
