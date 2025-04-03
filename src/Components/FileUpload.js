import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import "./FileUpload.css";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [preview, setPreview] = useState(null);
    const [graphs, setGraphs] = useState(null);
    const [elementTitles, setElementTitles] = useState([]);
    const [selectedElement, setSelectedElement] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);
    
    // API URL configuration
    const apiUrl = "https://altcarbon-1.onrender.com";
    const localUrl = "http://127.0.0.1:5000";
    const baseUrl = localUrl; // Change to apiUrl for production

    // Fetch element titles from the backend
    const fetchElementTitles = async () => {
        try {
            const response = await axios.get(`${baseUrl}/element-titles`);
            if (response.data && response.data.titles) {
                setElementTitles(response.data.titles);
            }
        } catch (error) {
            console.error("Error fetching element titles:", error);
        }
    };

    // Fetch graph data from the backend
    const fetchGraphData = async () => {
        try {
            const response = await axios.get(`${baseUrl}/graphs`);
            setGraphs(response.data);
        } catch (error) {
            console.error("Error fetching graph data:", error);
            setGraphs(null);
        }
    };

    // Fetch element titles on initial load if database exists
    useEffect(() => {
        fetchElementTitles();
    }, []);

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
            const uploadResponse = await axios.post(`${baseUrl}/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setMessage("File uploaded successfully!");
            setPreview(uploadResponse.data.preview);
            
            // Fetch element titles and graph data
            await fetchElementTitles();
            await fetchGraphData();
            
            // Reset selected element
            setSelectedElement(null);
            
        } catch (error) {
            console.error("File upload error:", error);
            setMessage(error.response?.data?.message || "File upload failed.");
            setPreview(null);
            setGraphs(null);
            setElementTitles([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setMessage("");
        setPreview(null);
        setGraphs(null);
        setSelectedElement(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleElementClick = (element) => {
        // Toggle selected element
        setSelectedElement(selectedElement === element ? null : element);
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Measurement Data'
            },
        },
        scales: {
            x: {
                ticks: {
                    autoSkip: true,
                    maxTicksLimit: 10, // Adjust as needed
                }
            }
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

            {/* Element Titles Menu */}
            {elementTitles.length > 0 && graphs && (
                <div className="element-titles-container">
                    <h3>Available Elements:</h3>
                    <div className="element-titles-menu">
                        {elementTitles.map((element) => (
                            <button
                                key={element}
                                className={`element-title-btn ${selectedElement === element ? 'active' : ''}`}
                                onClick={() => handleElementClick(element)}
                            >
                                {element}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Display selected graph or all graphs if no element is selected */}
            {graphs && (
                <div className="graphs-display">
                    {selectedElement ? (
                        // Display only the selected element's graph
                        graphs[selectedElement] && (
                            <div key={selectedElement} className="graph-container">
                                <h3>{selectedElement} Graph</h3>
                                <Line 
                                    data={graphs[selectedElement]} 
                                    options={{
                                        ...chartOptions,
                                        plugins: {
                                            ...chartOptions.plugins,
                                            title: {
                                                ...chartOptions.plugins.title,
                                                text: `${selectedElement} Measurement`
                                            }
                                        }
                                    }} 
                                />
                            </div>
                        )
                    ) : (
                        // Display a message to select an element
                        <div className="select-element-message">
                            <p>Select an element from the list above to view its graph.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileUpload;