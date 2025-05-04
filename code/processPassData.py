from sys import argv
import json

def process(file_name: str):
    full_path = f"./data/game/{file_name}"
    # contains a list of json objects
    data = json.load(open(full_path, "r", encoding="utf-8"))
    
    # Create new file to store passing data
    with open(f"./data/game/processed_{file_name.replace('.json', '.csv')}", "w") as f:
        f.write("minute,second,kongqiu_team,pass_player_name,pass_location_y,pass_location_x,jieqiu_team,jieqiu_player_name,end_location_y,end_location_x\n")
    
    # Append to data
    with open(f"./data/game/processed_{file_name.replace('.json', '.csv')}", "a") as f:
        # loop through each event to identify pass data
        for event in data:
            if event["type"]["name"] == "Pass":
                f.write(f"{event['minute']},{event['second']},{event['kongqiu_team']['name']},{event['player']['name']},{event['location'][0]},{event['location'][1]},{event['pass']['jieqiufan']['team']['name']},{event['pass']['jieqiufan']['name']},{event['pass']['end_location'][0]},{event['pass']['end_location'][1]}\n")

    
if __name__ == "__main__":
    # read json file
    # run in command line with base directory a 5005vis -- python .\code\processPassData.py <file_name>
    process(argv[1])