# Livo AI Pronunciation & Fluency Scorer - System Architecture

## Overview
This application is a 100% client-side web application designed to evaluate the English fluency and pronunciation of a 30-45 second audio clip. It leverages modern web technologies to run state-of-the-art AI models directly in the user's browser.

## Components & Data Flow

1.  **Frontend Interface (Next.js & React)**
    *   **Role**: Handles user interaction, file drag-and-drop, and strict client-side validation of audio duration (30-45s limit via the Web Audio API).
    *   **Styling**: Tailwind CSS for a modern, responsive, and engaging design.
2.  **Web Audio API**
    *   **Role**: Decodes the uploaded audio file (regardless of format like `.mp3`, `.wav`) and downsamples it into a 16kHz mono `Float32Array` required by the AI model.
3.  **Background Web Worker**
    *   **Role**: Runs the Hugging Face `transformers.js` engine asynchronously, ensuring the main UI thread remains unblocked and responsive during inference.
4.  **In-Browser AI Model (transformers.js / Whisper)**
    *   **Role**: Transcribes the audio into text with word-level timestamps.

**Data Flow**:
`User Uploads Audio` -> `AudioContext validation & decoding` -> `Float32Array sent to Web Worker` -> `Whisper Pipeline (transformers.js)` -> `JSON result with chunks sent back to Main Thread` -> `Fluency Heuristic applied` -> `UI Updated`.

## Models and APIs Used
*   **Model**: `Xenova/whisper-tiny.en` via `transformers.js`.
*   **Why over alternatives?**: 
    *   **Cost**: It is 100% free with no API limits.
    *   **Privacy**: It runs entirely on the client, eliminating the need to send user voice data to third-party servers.
    *   **Ease of Deployment**: The app can be hosted on any static hosting provider (Vercel, Netlify, GitHub Pages) without needing backend secrets or serverless function time limits.

## Scoring and Highlighting Logic
Because the client-side Whisper model does not natively expose raw phonetic confidence metrics, we implemented a **Fluency-Based Heuristic** to score the audio and highlight mistakes. This is a common and highly effective fallback for language learners:
1.  **Speech Rate (WPM)**: The application calculates the Words Per Minute based on the timestamps.
2.  **Hesitations**: Using word-level timestamps, the app calculates gaps between words. Any gap longer than 1.0 second is highlighted as an unnatural pause/hesitation.
3.  **Filler Words**: The transcript is parsed against a list of common English filler words ("um", "uh", "like", "you know") and mispronounced non-words.
4.  **Overall Score (0-100)**: The base score starts at 100 based on an optimal WPM range (120-160 WPM). Deductions are applied for every hesitation and filler word detected. The UI highlights hesitations in yellow and filler words in red.

## DPDP Compliance Posture (India's Data Protection Act 2023)
This application achieves a **Gold Standard for DPDP compliance** by employing edge AI:
*   **Storage & Data Residency**: The uploaded audio file **never leaves the user's device**. It is processed entirely in the browser's local memory and is immediately discarded after the transcript is generated. No data is stored on our servers.
*   **Retention**: Zero retention.
*   **Consent**: The UI includes a clear privacy notice informing the user that the processing is done locally to protect their privacy.
*   **Deletion**: Since no data is collected, the "Right to be forgotten" is inherently satisfied.

## Trade-offs and Future Considerations
**Trade-offs made:**
*   **Accuracy vs. Privacy**: We traded the high phonetic accuracy of paid backend APIs (like Azure Cognitive Services or AssemblyAI) for the ultimate privacy and zero-cost of in-browser execution. This necessitated the pivot from "phonetic scoring" to "fluency scoring".
*   **Initial Load Time**: The browser must download the ~40MB Whisper model on the first run, leading to a slower initial start compared to hitting an API. (However, subsequent runs are instant due to browser caching).

**What I would build with another week:**
1.  **Phonetic alignment**: Incorporate a lightweight forced-alignment model in the browser (or on a backend) to compare the transcript against a G2P (Grapheme-to-Phoneme) dictionary for true phonetic confidence scoring.
2.  **PWA Support**: Turn the app into a Progressive Web App so it can be installed on mobile devices and work entirely offline for language learners on the go.
3.  **Streaming Audio**: Implement microphone streaming with WebRTC so users don't have to record and upload a file manually.
