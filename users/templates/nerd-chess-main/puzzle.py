# Open the input file and read in the lines
with open('puzzles.txt', 'r') as input_file:
    lines = input_file.readlines()

# Modify each line with brackets and quotes
modified_lines = ['["{}", "hard""]\n'.format(line.strip()) for line in lines]

# Open the output file and write the modified lines
with open('output.txt', 'w') as output_file:
    output_file.writelines(modified_lines)