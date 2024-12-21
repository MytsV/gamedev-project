import sys
import librosa


def main():
    if len(sys.argv) < 2:
        print("Usage: python bpm_estimator.py <audio_file_path>")
        sys.exit(1)

    file_path = sys.argv[1]

    try:
        y, sr = librosa.load(file_path, sr=None)

        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)

        print(f"Estimated BPM: {tempo}")

        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, backtrack=True)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)
        first_beat_time = onset_times[0] if len(onset_times) > 0 else None

        if first_beat_time is not None:
            print(f"Timing of the first beat: {first_beat_time:.2f} seconds")
        else:
            print("No beats detected in the audio.")
    except Exception as e:
        print(f"Error processing the audio file: {e}")


if __name__ == "__main__":
    main()
