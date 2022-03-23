#!/bin/bash

#wget -q https://git.io/Je7rx -O - | bash /dev/stdin "--update" "--noservice" "--dev"

su - ssm -c "/opt/SSM/SatisfactoryServerManager --agent"
