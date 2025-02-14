import React, { useState, useRef } from "react";
import axios from "axios";
import "./FileUpload.css";

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [preview, setPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile && selectedFile.name.endsWith(".csv")) {
            setFile(selectedFile);
            setMessage("");
        } else {
            setFile(null);
            setMessage("Only CSV files are allowed.");
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setMessage("Please select a CSV file.");
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post("http://127.0.0.1:5000/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setMessage("File uploaded successfully!");
            setPreview(response.data.preview);
            
        } catch (error) {
            console.error("File upload error:", error);
            setMessage(error.response?.data?.message || "File upload failed.");
            setPreview(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setMessage("");
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="upload-container">
            <h2 className="title">Upload a CSV File</h2>
            <div className="upload-box">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="file-input"
                    ref={fileInputRef}
                    disabled={isLoading}
                />
                <div className="button-group">
                    <button 
                        onClick={handleUpload} 
                        className="upload-btn"
                        disabled={!file || isLoading}
                    >
                        {isLoading ? "Uploading..." : "Upload"}
                    </button>
                    <button 
                        onClick={handleReset} 
                        className="reset-btn"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {message && (
                <p className={message.includes("successfully") ? "success-message" : "error-message"}>
                    {message}
                </p>
            )}

            {preview && preview.length > 0 && (
                <div className="preview-container">
                    <h3>File Preview:</h3>
                    <div className="table-wrapper">
                        <table className="preview-table">
                            <thead>
                                <tr>
                                    {Object.keys(preview[0]).map((key) => (
                                        <th key={key}>{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, index) => (
                                    <tr key={index}>
                                        {Object.values(row).map((value, i) => (
                                            <td key={i}>{value}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
