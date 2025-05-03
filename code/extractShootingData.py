from nba_api.stats.endpoints import shotchartdetail
from nba_api.stats.library.http import NBAStatsHTTP
import json
import pandas as pd
import time
import os

def extractShootingData():
    NBAStatsHTTP.headers.update({
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.nba.com'
    })
    
    file_path = "./data/all_players_shooting_stats.csv"
    
    unique_seasons = pd.read_csv("./data/all_players_career_stats.csv")["SEASON_ID"].unique()
    
    for season in unique_seasons:
        print(f"Fetching data for season: {season}")
        try:
            response = shotchartdetail.ShotChartDetail(
                team_id=0,
                player_id=0,
                season_nullable=season,
                context_measure_simple = 'FGA',
                season_type_all_star='Regular Season'
            )

            content = json.loads(response.get_json())

            results = content['resultSets'][0]
            headers = results['headers']
            rows = results['rowSet']
            df = pd.DataFrame(rows)
            df.columns = headers
            df = df[["PLAYER_ID","ACTION_TYPE","SHOT_TYPE","SHOT_ZONE_BASIC","SHOT_ZONE_AREA","SHOT_ZONE_RANGE","SHOT_DISTANCE","LOC_X","LOC_Y","SHOT_ATTEMPTED_FLAG","SHOT_MADE_FLAG"]]
            df["SEASON_ID"] = season  # Add season ID to the DataFrame
            
            # Check if file exists to decide whether to write header
            file_exists = os.path.isfile(file_path)
            
            # Append to CSV
            df.to_csv(file_path, mode='a', index=False, header=not file_exists)
    
        except Exception as e:
            print(f"Error fetching data for season {season}: {e}")
        
        time.sleep(1.5)  # Wait 1.5 seconds between requests

if __name__ == "__main__":
    extractShootingData()
    print("Data extraction complete.")