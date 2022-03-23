# syntax=docker/dockerfile:1
FROM ubuntu:20.04

RUN apt-get update -y && apt-get install apt-utils wget curl htop -y

RUN apt-get upgrade -y

RUN mkdir /opt/SSM

RUN useradd -m -s /bin/bash ssm 

RUN chown -R ssm:ssm /opt/SSM

VOLUME /opt/SSM

COPY entry.sh /
COPY release-builds/linux/* /opt/SSM

RUN chown -R ssm:ssm /opt/SSM

EXPOSE 3000/tcp

ENTRYPOINT [ "/entry.sh" ]