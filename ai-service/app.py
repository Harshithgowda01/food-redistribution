from flask import Flask, jsonify, request
from flask_cors import CORS
from matching import match_ngos
from demand_prediction import predict_demand

app = Flask(__name__)
CORS(app)


@app.route('/')
def home():
    return jsonify({'message': 'AI Service is running', 'status': 'OK'})


@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})


@app.route('/match-ngo', methods=['POST'])
def match_ngo_endpoint():
    try:
        data = request.get_json()
        donation = data.get('donation')
        ngos = data.get('ngos')

        if not donation or not ngos:
            return jsonify({'error': 'donation and ngos are required'}), 400

        ranked_ngos = match_ngos(donation, ngos)

        return jsonify({
            'rankedNGOs': ranked_ngos,
            'totalConsidered': len(ranked_ngos)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict-demand', methods=['POST'])
def predict_demand_endpoint():
    try:
        data = request.get_json() or {}
        donations_history = data.get('donations', [])
        prediction_result = predict_demand(donations_history)
        return jsonify(prediction_result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(port=8000, debug=True)