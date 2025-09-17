# Polaroid Generator 📸

A simple and fun web application to turn your digital photos into classic-looking Polaroids. Add a handwritten caption, apply vintage filters, and get a shareable image in seconds.

---

## ✨ Features

* **Image Upload**: Upload any JPG, PNG, or WEBP image from your device.
* **Custom Captions**: Write your own caption with a stylish, handwritten font.
* **AI-Powered Suggestions**: Don't know what to write? Get a nostalgic caption suggestion powered by the Google Gemini API.
* **Language Support**: Get AI caption suggestions in English or Indonesian.
* **Vintage Filters**: Choose from several filters to give your photo that perfect retro vibe (Classic, Vintage, B&W, etc.).
* **Noise Adjustment**: Add a grainy texture to enhance the analog feel.
* **High-Quality Download**: Save your final Polaroid creation as a high-resolution PNG file.

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
* **Backend**: Vercel Serverless Functions (Node.js)
* **APIs**: Google Gemini API for caption generation

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

* [Node.js](https://nodejs.org/) (which includes npm) installed on your machine.
* A Google Gemini API Key. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Local Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/kellyman1717/polaroid-generator.git
    cd polaroid-generator
    ```

2.  **Install the Vercel CLI:**
    This tool will allow you to run the serverless function locally.
    ```bash
    npm install -g vercel
    ```

3.  **Create the Environment Variable file:**
    Create a new file named `.env` in the root of the project folder and add your API key.
    ```
    GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY_HERE
    ```

4.  **Run the development server:**
    ```bash
    vercel dev
    ```

5.  Open your browser and navigate to `http://localhost:3000` to see the application running.

---

## 📦 Deployment

This project is optimized for deployment on [Vercel](https://vercel.com/). Simply connect your GitHub repository to Vercel and add your `GEMINI_API_KEY` as an environment variable in the Vercel project settings.