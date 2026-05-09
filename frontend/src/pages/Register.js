import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function Register() {

    const [formData, setFormData] = useState({

        name: '',
        email: '',
        password: ''
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

            const res = await axios.post(
                `${API_BASE_URL}/api/auth/register`,
                formData
            );

            alert('Register Success');

            console.log(res.data);

        } catch (error) {

            alert(error.response?.data?.message || 'Registration failed');
        }
    };

    return (

        <div className="container">

            <form
                className="form"
                onSubmit={handleSubmit}
            >

                <h1>Register</h1>

                <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    onChange={handleChange}
                />

                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    onChange={handleChange}
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    onChange={handleChange}
                />

                <button type="submit">
                    Register
                </button>

            </form>

        </div>
    );
}

export default Register;