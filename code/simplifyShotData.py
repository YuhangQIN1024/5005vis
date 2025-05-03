import pandas as pd

def simplify():
    df = pd.read_csv("./data/all_players_shooting_stats.csv")

    df = df[["PLAYER_ID","LOC_X","LOC_Y","SHOT_MADE_FLAG","SEASON_ID"]]
    df.to_csv("./data/simplified_shot_data.csv", index=False)
    
if __name__ == "__main__":
    simplify()