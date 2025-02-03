import React, { useState, useRef } from "react";
import axios from "axios";
import "./FileUpload.css"; // Import CSS file

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null); // Ref to reset the file input field

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) {
            setMessage("Please select a CSV file.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post("http://127.0.0.1:5000/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setMessage("File uploaded successfully!"); // Success message
            setPreview(response.data.preview);

            // Reset all states and file input after 3 seconds
            setTimeout(() => {
                setFile(null);
                setMessage("");
                setPreview(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = ""; // Reset file input field
                }
            }, 300000);
        } catch (error) {
            setMessage("File upload failed.");
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
                    ref={fileInputRef} // Attach ref to the input field
                />
                <button onClick={handleUpload} className="upload-btn">Upload</button>
            </div>
            {message && <p className="message">{message}</p>}

            {preview && (
                <div className="preview-container">
                    <h3>CSV Preview:</h3>
                    <pre className="preview-box">{JSON.stringify(preview, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
