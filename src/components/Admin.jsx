import { useState } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../api';

const Admin = () => {
    const [secretKey, setSecretKey] = useState('');
    const [publishDate, setPublishDate] = useState('');
    const [gridData, setGridData] = useState('');
    const [clueData, setClueData] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!secretKey || !publishDate || !gridData || !clueData) {
            setError('All fields are required.');
            return;
        }

        try {
            const payload = { secretKey, publishDate, gridData, clueData };
            const response = await axios.post(buildApiUrl('/api/puzzles/add'), payload);
            setMessage(response.data.message);
            setPublishDate('');
            setGridData('');
            setClueData('');
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'An error occurred while submitting the puzzle.';
            setError(errorMessage);
            console.error('Submission error:', err);
        }
    };

    return (
        <section className="st-admin-wrapper">
            <div className="st-admin-card">
                <header className="st-admin-header">
                    <h1>Add New Crossword Puzzle</h1>
                    <p>Publish a puzzle for a specific day by uploading the grid and clues below.</p>
                </header>

                {message && (
                    <div className="st-admin-alert st-admin-alert--success" role="status">{message}</div>
                )}
                {error && (
                    <div className="st-admin-alert st-admin-alert--error" role="alert">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="st-admin-form">
                    <div className="st-form-field">
                        <label htmlFor="secretKey">Secret Key</label>
                        <input
                            type="password"
                            id="secretKey"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            required
                        />
                    </div>

                    <div className="st-form-field">
                        <label htmlFor="publishDate">Publish Date</label>
                        <input
                            type="date"
                            id="publishDate"
                            value={publishDate}
                            onChange={(e) => setPublishDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="st-form-field">
                        <label htmlFor="gridData">Grid Data (5x5 CSV)</label>
                        <textarea
                            id="gridData"
                            rows="6"
                            value={gridData}
                            onChange={(e) => setGridData(e.target.value)}
                            placeholder={"Example:\nS,N,A,I,L\nA,E,L,S,A\nL,A,T,E,X\nE,S,S,A,Y\nS,A,L,V,O"}
                            required
                        ></textarea>
                        <p>Enter five rows of five characters separated by commas. Use '#' for black squares.</p>
                    </div>

                    <div className="st-form-field">
                        <label htmlFor="clueData">Clue Data (CSV)</label>
                        <textarea
                            id="clueData"
                            rows="8"
                            value={clueData}
                            onChange={(e) => setClueData(e.target.value)}
                            placeholder={"Example:\ndirection,number,clue\nacross,1,Slow-moving mollusk\nacross,5,___-Lorraine (French region)\ndown,2,___ and void"}
                            required
                        ></textarea>
                        <p>Use the headers <code>direction,number,clue</code>. Direction must be <code>across</code> or <code>down</code>.</p>
                    </div>

                    <div className="st-form-actions">
                        <button type="submit" className="st-button st-button--primary">
                            Submit Puzzle
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default Admin;