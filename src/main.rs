mod music_selection;
mod player;
mod music_data;

use music_selection::MusicQueue;
use player::MusicPlayer;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let music_queue = MusicQueue::new(Default::default());

    let music_player = MusicPlayer::new(music_queue);
    let _device = music_player.start_playing();

    std::thread::park();

    Ok(())
}
