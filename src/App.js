import React from "react";
import FileUpload from "./Components/FileUpload";
import "./App.css"; // Import global styles

function App() {
    return (
      <div className="app-container" style={{ textAlign: "center" }}>
      <h1>Alt Carbon</h1>
      <FileUpload />
      </div>
    );
}

export default App;

