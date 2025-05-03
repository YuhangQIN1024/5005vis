import pandas as pd
import os
import math

def split_csv(input_file, output_dir, max_size_mb=100):
    # Ensure output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Read the CSV file
    df = pd.read_csv(input_file)
    
    # Calculate total size of file in MB
    file_size = os.path.getsize(input_file) / (1024 * 1024)  # Convert to MB
    
    # Calculate number of partitions needed
    num_partitions = math.ceil(file_size / max_size_mb)
    
    # Calculate rows per partition
    rows_per_partition = math.ceil(len(df) / num_partitions)
    
    # Split and save
    for i in range(num_partitions):
        start_idx = i * rows_per_partition
        end_idx = min((i + 1) * rows_per_partition, len(df))
        
        # Create partition
        partition = df.iloc[start_idx:end_idx]
        
        # Generate output filename
        output_file = os.path.join(output_dir, f'simplified_shot_data_part_{i+1}.csv')
        
        # Save partition
        partition.to_csv(output_file, index=False)
        
        # Print info about created file
        file_size_mb = os.path.getsize(output_file) / (1024 * 1024)
        print(f'Created {output_file} ({file_size_mb:.2f} MB)')

if __name__ == "__main__":
    # Run the function
    input_file = './data/simplified_shot_data.csv'
    output_dir = './data'
    split_csv(input_file, output_dir)
