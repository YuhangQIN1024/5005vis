from sys import argv
import pandas as pd
from nba_api.stats.endpoints import BoxScoreAdvancedV3
from nba_api.stats.endpoints import BoxScoreTraditionalV2


def extract(gameID=str):
    advanced_stats = BoxScoreAdvancedV3(game_id=gameID)
    advanced_stats = advanced_stats.get_data_frames()[0]
    advanced_subset = advanced_stats[["personId", "offensiveRating", "defensiveRating"]]
    
    norm_stats = BoxScoreTraditionalV2(game_id=gameID)
    norm_stats = norm_stats.get_data_frames()[0]
    
    merged_stats = norm_stats.merge(
        advanced_subset, 
        left_on="PLAYER_ID", 
        right_on="personId", 
        how="left"
    )
    
    merged_stats.to_csv(f"./data/game/stats_{gameID}.csv", index=False)
    
if __name__ == "__main__":
    extract(argv[1])