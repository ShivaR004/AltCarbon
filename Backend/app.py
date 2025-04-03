from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import pandas as pd
import io
import os, json
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

def process_csv(file_stream):
    # Ensure RunDb directory exists
    db_dir = 'RunDb'
    os.makedirs(db_dir, exist_ok=True)

    db_path = os.path.join(db_dir, 'Run.db')

    # Delete existing Run.db file to start fresh
    if os.path.exists(db_path):
        os.remove(db_path)

    try:
        conn = sqlite3.connect(db_path)
        df = pd.read_csv(file_stream)

        # Reset Run Number
        df.insert(0, 'Run Number', 1)
        row_number = df[df['Solution Label'] == 'QC_MES_5 ppm'].index
        if not row_number.empty:
            df = df.loc[row_number[0]:]
        df.reset_index(drop=True, inplace=True)

        # Assign Run Numbers
        r = 0
        for i in range(len(df)):
            if df.loc[i, 'Solution Label'] == 'QC_MES_5 ppm':
                r += 1
            df.loc[i, 'Run Number'] = r

        # Save the fresh dataset to the new database
        df.to_sql('Run', conn, if_exists='replace', index=False)
        conn.commit()
    except Exception as e:
        print(f"CSV processing error: {e}")
        return False
    finally:
        conn.close()

    return True

def get_graph_data():
    db_path = os.path.join("RunDb", "Run.db")
    conn = sqlite3.connect(db_path)
    df = pd.read_sql("SELECT * FROM Run", conn)  # Fetch all columns
    conn.close()
    
    if df.empty:
        return jsonify({"message": "No data available"}), 400
    
    # Group by Run Number and take the first row for each unique measurement
    df_first_rows = df.groupby('Run Number').first().reset_index()
    
    df_first_rows["Timestamp"] = pd.to_datetime(df_first_rows["Timestamp"])
    
    # Get element names (exclude "Run Number" and "Timestamp")
    element_columns = [col for col in df_first_rows.columns if col not in ["Run Number", "Timestamp", "Rack:Tube", "Solution Label"]]
    
    # Prepare data for Chart.js
    chart_data = {}
    for element in element_columns:
        chart_data[element] = {
            'labels': df_first_rows["Timestamp"].dt.strftime('%Y-%m-%d %H:%M:%S').tolist(),
            'datasets': [{
                'label': element,
                'data': df_first_rows[element].tolist(),
                'borderColor': 'rgb(75, 192, 192)',
                'tension': 0.1
            }]
        }
    
    return jsonify(chart_data)    

# New endpoint to get element titles
@app.route("/element-titles", methods=["GET"])
def get_element_titles():
    try:
        db_path = os.path.join("RunDb", "Run.db")
        
        # Check if database exists
        if not os.path.exists(db_path):
            return jsonify({"titles": [], "message": "No database found"}), 200
            
        conn = sqlite3.connect(db_path)
        # Get column names from the Run table
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(Run)")
        columns = cursor.fetchall()
        conn.close()
        
        # Filter out 'Run Number' and 'Timestamp' columns
        element_titles = [col[1] for col in columns if col[1] not in ["Run Number", "Timestamp", "Rack:Tube", "Solution Label"]]
        
        return jsonify({"titles": element_titles}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/")
def index():
    return get_graph_data()

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
            
            preview_data = df.head(5).to_dict(orient="records")
            
            # Save file
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file_stream.seek(0)
            with open(file_path, 'wb') as f:
                f.write(file_stream.getvalue())
            
            # run db file processing
            process_csv(file_stream)
                
            return jsonify({
                "message": "File uploaded successfully",
                "preview": preview_data
            }), 200
        
        except Exception as e:
            return jsonify({"message": f"Error processing file: {str(e)}"}), 500
    return jsonify({"message": "Invalid file format"}), 400

@app.route("/graphs")
def get_graphs():
    return get_graph_data()

if __name__ == "__main__":
    app.run(debug=True, port=5000)