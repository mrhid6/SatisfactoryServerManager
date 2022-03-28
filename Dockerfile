# syntax=docker/dockerfile:1
FROM ubuntu:20.04

RUN apt update -y
RUN apt-get upgrade -y

RUN apt-get install binutils software-properties-common libcap2-bin -y
RUN add-apt-repository multiverse
RUN dpkg --add-architecture i386

RUN apt-get install lib32gcc-s1 -y 
RUN apt-get update -y && apt-get install apt-utils wget curl htop -y


RUN useradd -m -s /bin/bash ssm 

RUN mkdir /opt/SSM
RUN chown -R ssm:ssm /opt/SSM

RUN mkdir -p /home/ssm/.SatisfactoryServerManager
RUN mkdir -p /home/ssm/.config/Epic/FactoryGame

RUN chown -R ssm:ssm /home/ssm

VOLUME /opt/SSM

COPY entry.sh /
COPY release-builds/linux/* /opt/SSM

RUN chown -R ssm:ssm /opt/SSM

EXPOSE 3000/tcp

ENTRYPOINT [ "/entry.sh" ]