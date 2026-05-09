import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function Dashboard() {

    const [formData, setFormData] = useState({

        title: '',
        content: '',
        mood: ''
    });

    const handleChange = (e) => {

        setFormData({

            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const token = localStorage.getItem('token');

            const res = await axios.post(

                `${API_BASE_URL}/api/diaries`,

                formData,

                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            alert('Diary Created');

            console.log(res.data);

            setFormData({
                title: '',
                content: '',
                mood: ''
            });

        } catch (error) {

            alert(error.response?.data?.message || 'Failed to create diary');
        }
    };

    return (

        <div className="container">

            <form
                className="form"
                onSubmit={handleSubmit}
            >

                <h1>Create Diary</h1>

                <input
                    type="text"
                    name="title"
                    placeholder="Title"
                    value={formData.title}
                    onChange={handleChange}
                />

                <textarea
                    name="content"
                    placeholder="Write your diary..."
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
                    Save Diary
                </button>

            </form>

        </div>
    );
}

export default Dashboard;