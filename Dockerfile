# syntax=docker/dockerfile:1
FROM ubuntu:latest

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get -qq update -y && apt-get -qq upgrade -y

RUN apt-get -qq install binutils software-properties-common libcap2-bin apt-utils wget curl htop dnsmasq -y
RUN add-apt-repository multiverse
RUN dpkg --add-architecture i386

RUN apt-get -qq install lib32gcc-s1 -y 
RUN apt-get -qq update -y

RUN useradd -m -u 9999 -s /bin/bash ssm 

RUN mkdir /opt/SSM
VOLUME /opt/SSM

COPY release-builds/linux/* /opt/SSM/
RUN chown -R ssm:ssm /opt/SSM

RUN mkdir -p /home/ssm/.SatisfactoryServerManager && mkdir -p /home/ssm/.config/Epic/FactoryGame
RUN chown -R ssm:ssm /home/ssm

COPY entry.sh /entry.sh
RUN chmod 755 /entry.sh

RUN ls -l /

EXPOSE 3000/tcp

ENTRYPOINT [ "/entry.sh" ]
