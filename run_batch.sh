#!/bin/bash
first=$1
second=$2
while [ "$first" -le "$second" ]
do
    echo $first 
    python make_gee_edts.py $first
    let first=first+1
done
echo + [thread-main] all days done
