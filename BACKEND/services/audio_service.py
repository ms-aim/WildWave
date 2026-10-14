from pydub import AudioSegment


def prepare_audio(input_path, output_path):
    """
    Convert uploaded audio into BirdNET-compatible WAV format.
    """

    audio = AudioSegment.from_file(input_path)

    audio = audio.set_frame_rate(48000)
    audio = audio.set_channels(1)

    audio.export(
        output_path,
        format="wav"
    )

    return {
        "duration": len(audio) / 1000,
        "sample_rate": audio.frame_rate,
        "channels": audio.channels
    }