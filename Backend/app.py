from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pandas as pd
import json
import io
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

ALLOWED_EXTENSIONS = {"csv"}

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        return str(obj)

app.json_encoder = CustomJSONEncoder

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/")
@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files["file"]
    
    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        try:
            file_stream = io.BytesIO(file.read())
            file_stream.seek(0)
            
            df = pd.read_csv(file_stream)
            
            df = df.astype(str)  # Convert all columns to string type during reading
            
            preview_data = df.head(10).to_dict(orient="records")
            
            # Save file
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file_stream.seek(0)
            with open(file_path, 'wb') as f:
                f.write(file_stream.getvalue())
                
            return jsonify({
                "message": "File uploaded successfully",
                "preview": preview_data
            }), 200
            
        except Exception as e:
            return jsonify({"message": f"Error reading file: {str(e)}"}), 500

    return jsonify({"message": "Invalid file format"}), 400

if __name__ == "__main__":
    app.run(debug=True, port=5000)
