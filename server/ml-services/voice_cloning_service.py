#!/usr/bin/env python3
"""
Voice Cloning Service - Extract voice characteristics from reference audio

This service analyzes reference audio to extract voice characteristics including:
- Fundamental frequency (pitch)
- Formant frequencies (F1, F2, F3)
- Speaking rate
- Energy/intensity patterns

These characteristics are used to synthesize speech that mimics the reference voice.
"""

import sys
import json
import base64
import numpy as np
import wave
import io
from typing import Dict, Any, Tuple

class VoiceCloner:
    def __init__(self):
        self.sample_rate = 16000
        
    def analyze_audio(self, audio_data: bytes) -> Dict[str, Any]:
        """
        Analyze reference audio and extract voice characteristics
        
        Args:
            audio_data: Raw audio bytes (WAV format expected)
            
        Returns:
            Dictionary of voice characteristics
        """
        try:
            # Parse WAV file
            with wave.open(io.BytesIO(audio_data), 'rb') as wav_file:
                sample_rate = wav_file.getframerate()
                n_channels = wav_file.getnchannels()
                n_frames = wav_file.getnframes()
                audio_bytes = wav_file.readframes(n_frames)
                
            # Convert to numpy array
            if n_channels == 1:
                audio = np.frombuffer(audio_bytes, dtype=np.int16)
            else:
                # Convert stereo to mono by averaging channels
                audio_stereo = np.frombuffer(audio_bytes, dtype=np.int16)
                audio = audio_stereo.reshape(-1, n_channels).mean(axis=1).astype(np.int16)
            
            # Normalize to [-1, 1]
            audio_normalized = audio.astype(np.float32) / 32768.0
            
            # Extract voice characteristics
            characteristics = self._extract_characteristics(audio_normalized, sample_rate)
            
            return {
                "success": True,
                "characteristics": characteristics,
                "duration": len(audio_normalized) / sample_rate,
                "sample_rate": sample_rate,
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    def _extract_characteristics(self, audio: np.ndarray, sample_rate: int) -> Dict[str, Any]:
        """Extract voice characteristics from audio signal"""
        
        # Estimate fundamental frequency (F0) - average pitch
        f0 = self._estimate_pitch(audio, sample_rate)
        
        # Estimate formant frequencies (vocal tract resonances)
        formants = self._estimate_formants(audio, sample_rate)
        
        # Estimate speaking rate
        speaking_rate = self._estimate_speaking_rate(audio, sample_rate)
        
        # Estimate average energy
        energy = float(np.sqrt(np.mean(audio ** 2)))
        
        # Estimate pitch variance (expressiveness)
        pitch_variance = self._estimate_pitch_variance(audio, sample_rate)
        
        return {
            "fundamental_frequency": f0,
            "formants": formants,
            "speaking_rate": speaking_rate,
            "energy": energy,
            "pitch_variance": pitch_variance,
        }
    
    def _estimate_pitch(self, audio: np.ndarray, sample_rate: int) -> float:
        """
        Estimate average fundamental frequency (pitch) using autocorrelation
        
        Typical ranges:
        - Male voices: 85-180 Hz
        - Female voices: 165-255 Hz
        """
        # Use autocorrelation method for pitch detection
        # Search in typical human voice range (80-400 Hz)
        min_lag = int(sample_rate / 400)  # 400 Hz
        max_lag = int(sample_rate / 80)   # 80 Hz
        
        # Calculate autocorrelation
        autocorr = np.correlate(audio, audio, mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        
        # Find peak in autocorrelation within pitch range
        search_range = autocorr[min_lag:max_lag]
        if len(search_range) > 0:
            peak_lag = min_lag + np.argmax(search_range)
            f0 = sample_rate / peak_lag
        else:
            # Default to 150 Hz if detection fails
            f0 = 150.0
        
        # Clamp to realistic range
        f0 = np.clip(f0, 80, 400)
        
        return float(f0)
    
    def _estimate_formants(self, audio: np.ndarray, sample_rate: int) -> Dict[str, float]:
        """
        Estimate formant frequencies (F1, F2, F3) using spectral peak detection
        
        Formants are resonant frequencies of the vocal tract that determine vowel quality
        Typical ranges:
        - F1: 200-1000 Hz (jaw opening)
        - F2: 600-3000 Hz (tongue position)
        - F3: 1500-4000 Hz (lip rounding)
        """
        # Compute power spectrum
        fft = np.fft.rfft(audio)
        power_spectrum = np.abs(fft) ** 2
        freqs = np.fft.rfftfreq(len(audio), 1 / sample_rate)
        
        # Find spectral peaks in formant frequency ranges
        f1 = self._find_peak_in_range(freqs, power_spectrum, 200, 1000)
        f2 = self._find_peak_in_range(freqs, power_spectrum, 600, 3000)
        f3 = self._find_peak_in_range(freqs, power_spectrum, 1500, 4000)
        
        return {
            "f1": float(f1),
            "f2": float(f2),
            "f3": float(f3),
        }
    
    def _find_peak_in_range(self, freqs: np.ndarray, power: np.ndarray, 
                           min_freq: float, max_freq: float) -> float:
        """Find frequency of maximum power in given range"""
        mask = (freqs >= min_freq) & (freqs <= max_freq)
        if not np.any(mask):
            return (min_freq + max_freq) / 2  # Return midpoint if range is empty
        
        range_power = power[mask]
        range_freqs = freqs[mask]
        
        peak_idx = np.argmax(range_power)
        return range_freqs[peak_idx]
    
    def _estimate_speaking_rate(self, audio: np.ndarray, sample_rate: int) -> float:
        """
        Estimate speaking rate in words per minute
        Uses zero-crossing rate as a proxy for articulation speed
        """
        # Calculate zero-crossing rate
        zero_crossings = np.sum(np.abs(np.diff(np.sign(audio)))) / 2
        duration_seconds = len(audio) / sample_rate
        
        # Convert to approximate words per minute
        # Typical range: 120-180 WPM
        # Higher zero-crossing rate correlates with faster speech
        zcr_per_second = zero_crossings / duration_seconds
        wpm = np.clip(zcr_per_second * 0.02, 100, 200)  # Empirical scaling factor
        
        return float(wpm)
    
    def _estimate_pitch_variance(self, audio: np.ndarray, sample_rate: int) -> float:
        """
        Estimate pitch variance (expressiveness/monotony)
        Higher values = more expressive, lower = more monotone
        """
        # Divide audio into frames and estimate pitch for each
        frame_length = int(0.05 * sample_rate)  # 50ms frames
        hop_length = int(0.025 * sample_rate)   # 25ms hop
        
        pitches = []
        for start in range(0, len(audio) - frame_length, hop_length):
            frame = audio[start:start + frame_length]
            pitch = self._estimate_pitch(frame, sample_rate)
            pitches.append(pitch)
        
        # Calculate coefficient of variation (std / mean)
        if len(pitches) > 0:
            pitch_variance = float(np.std(pitches) / (np.mean(pitches) + 1e-6))
        else:
            pitch_variance = 0.1  # Default moderate variance
        
        return pitch_variance


def main():
    """Main processing loop - reads requests from stdin, writes responses to stdout"""
    cloner = VoiceCloner()
    
    # Signal ready
    print(json.dumps({"status": "ready"}), flush=True)
    
    while True:
        try:
            # Read request from stdin
            line = sys.stdin.readline()
            if not line:
                break
                
            request = json.loads(line)
            command = request.get("command")
            
            if command == "analyze":
                # Decode base64 audio data
                audio_b64 = request.get("audio")
                audio_data = base64.b64decode(audio_b64)
                
                # Analyze audio
                result = cloner.analyze_audio(audio_data)
                
                # Send response
                response = {
                    "success": result["success"],
                    "result": result if result["success"] else None,
                    "error": result.get("error"),
                }
                print(json.dumps(response), flush=True)
                
            elif command == "ping":
                print(json.dumps({"status": "pong"}), flush=True)
                
            else:
                print(json.dumps({
                    "success": False,
                    "error": f"Unknown command: {command}"
                }), flush=True)
                
        except Exception as e:
            print(json.dumps({
                "success": False,
                "error": str(e)
            }), flush=True)


if __name__ == "__main__":
    main()
