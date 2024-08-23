use std::{fmt::Display, sync::OnceLock};
use std::fs::File;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::from_reader;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Music(usize);
impl Display for Music {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.get_data().title)
    }
}

impl Music {
    pub fn from_index(index: usize) -> Self {
        Self(index)
    }
    pub fn get_data(&self) -> &MusicData {
        &get_all_music_data()[self.0]
    }
    pub fn get_index(&self) -> usize {
        self.0
    }
}

#[derive(Serialize, Deserialize)]
pub struct VideoStatistics {
    pub views: usize,
    pub likes: usize,
    pub comments: usize,
}

#[derive(Serialize, Deserialize)]
pub struct MusicData {
    pub id: String,
    pub title: String,
    pub channel: String,
    pub publication_date: DateTime<Utc>,
    pub thumbnail: String,
    pub duration: usize,
    pub statistics: VideoStatistics,
    pub path: String,
}

fn get_all_music_data() -> &'static Vec<MusicData> {
    #[derive(Deserialize)]
    struct JsonFormat {
        musics: Vec<MusicData>,
    }

    static MUSIC_DATA: OnceLock<Vec<MusicData>> = OnceLock::new();
    MUSIC_DATA.get_or_init(|| {
        from_reader::<File, JsonFormat>(
            File::open("./data/music_data.json").expect("couldn't find ./data/music_data.json"),
        )
        .expect("./data/music_data.json did not contain valid json")
        .musics
    })
}

pub fn music_count() -> usize {
    get_all_music_data().len()
}
