use std::ops::Not;

use rand::seq::IteratorRandom;
use thiserror::Error;

use crate::music_data::{music_count, Music};

const MUSICS_DIRECTORY: &'static str = "./musics";

#[derive(Error, Debug)]
pub enum MusicSelectionError {
    #[error("there was no available music to choose from with the given settings")]
    NoMusicAvailable,
}

pub struct MusicQueueConfiguration {
    no_repeat_length: usize,
}
impl MusicQueueConfiguration {
    pub fn new(no_repeat_length: usize) -> Self {
        Self { no_repeat_length }
    }
}
impl Default for MusicQueueConfiguration {
    fn default() -> Self {
        Self {
            no_repeat_length: 50,
        }
    }
}

pub struct MusicQueue {
    queue: Vec<Music>,
    current_music: Option<usize>,
    config: MusicQueueConfiguration,
}

impl MusicQueue {
    pub fn new(config: MusicQueueConfiguration) -> MusicQueue {
        MusicQueue {
            queue: vec![],
            current_music: None,
            config,
        }
    }
    pub fn get_current_music(&self) -> Option<Music> {
        Some(self.queue[self.current_music?])
    }
    pub fn append_music(&mut self, music: Music) {
        self.queue.push(music);
    }
    // TODO: give a closure as an argument to be the used algorithm to select musics
    pub fn append_random_music(&mut self) -> anyhow::Result<()> {
        let prohibited_musics = &self.queue[self
            .queue
            .len()
            .saturating_sub(self.config.no_repeat_length)
            ..self.queue.len()];

        self.queue.push(
            (0..music_count())
                .filter_map(|index| {
                    let music = Music::from_index(index);
                    prohibited_musics.contains(&music).not().then_some(music)
                })
                .choose(&mut rand::thread_rng())
                .ok_or(MusicSelectionError::NoMusicAvailable)?,
        );

        Ok(())
    }
    pub fn skip(&mut self, count: usize) -> anyhow::Result<()> {
        self.current_music = Some(self.current_music.map_or(0, |i| i + count));
        let curr_music = self.current_music.unwrap();
        while self.queue.len() <= curr_music {
            self.append_random_music()?;;
        }
        Ok(())
    }
    pub fn go_back(&mut self, count: usize) {
        self.current_music = self.current_music.map(|i| i.saturating_sub(count));
    }
}
