use std::{
    fs::File,
    sync::{Arc, Mutex},
};

use thiserror::Error;
use tinyaudio::prelude::*;

use crate::music_selection::MusicQueue;

#[derive(Debug, Error)]
enum MusicPlayerError {
    #[error("an unknown error happened while creating an output device")]
    OutputDeviceCreationError,
}

struct MusicPlayerData {
    music_queue: MusicQueue,
    volume: f32,
}

pub struct MusicPlayer {
    data: Arc<Mutex<MusicPlayerData>>,
}

impl MusicPlayer {
    pub fn new(music_queue: MusicQueue) -> Self {
        Self {
            data: Arc::new(Mutex::new(MusicPlayerData {
                music_queue,
                volume: 1.0,
            })),
        }
    }
    pub fn start_playing(&self) -> anyhow::Result<Box<dyn BaseAudioOutputDevice>> {
        let mut decoder = None;
        let mut frame = None;
        let mut current_index = 0;
        let mut first_music = true;

        let player_data = self.data.clone();
        run_output_device(
            OutputDeviceParameters {
                sample_rate: 44100,
                channel_sample_count: 4410,
                channels_count: 2,
            },
            move |data| {
                if frame.is_none() {
                    let mut player_data = player_data.lock().unwrap();
                    if first_music {
                        first_music = false;
                    } else if player_data.music_queue.skip(1).is_err() {
                        return;
                    }
                    let Some(music) = player_data.music_queue.get_current_music() else {
                        return;
                    };
                    drop(player_data); // drop the value early on so the mutex is unlocked as soon as possible
                    let Ok(file) = File::open(&music.get_data().path) else {
                        return;
                    };
                    decoder = Some(puremp3::Mp3Decoder::new(file));
                    frame = decoder.as_mut().unwrap().next_frame().ok();
                    if frame.is_none() {
                        return;
                    }
                    current_index = 0;
                }
                let volume = player_data.lock().unwrap().volume;
                let mut current_frame = frame.as_ref().unwrap();
                for samples in data.chunks_mut(2) {
                    if current_index < current_frame.num_samples {
                        samples[0] = volume * current_frame.samples[0][current_index];
                        samples[1] = volume * current_frame.samples[1][current_index];
                        current_index += 1;
                    } else {
                        frame = decoder.as_mut().unwrap().next_frame().ok();
                        current_frame = frame.as_ref().unwrap();
                        if frame.is_none() {
                            break;
                        }
                        current_index = 0;
                    }
                }
            },
        )
        .map_err(|_| MusicPlayerError::OutputDeviceCreationError.into())
    }
}
