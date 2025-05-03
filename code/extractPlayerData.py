from nba_api.stats.endpoints import playercareerstats
from nba_api.stats.static import players
import os

import pandas as pd
from nba_api.stats.library.http import NBAStatsHTTP
import time

def extract_all_player_data():
    NBAStatsHTTP.headers.update({
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.nba.com'
    })
    
    nba_players = players.get_players()
    file_path = "./data/all_players_career_stats.csv"
    
    for player in nba_players:
        player_id = player['id']
        player_name = player['full_name']
        print(f"Fetching data for player: {player_name} (ID: {player_id})")
        try:
            career = playercareerstats.PlayerCareerStats(player_id=player_id)
            career_data = career.get_data_frames()[0]
            career_data["player_name"] = player_name
            # Check if file exists to decide whether to write header
            file_exists = os.path.isfile(file_path)
            
            # Append to CSV
            career_data.to_csv(file_path, mode='a', index=False, header=not file_exists)
        
        except Exception as e:
            print(f"Error fetching data for player {player_id}: {e}")
        
        time.sleep(1.5)  # Wait 1.5 seconds between requests
    
if __name__ == "__main__":
    extract_all_player_data()