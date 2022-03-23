export GITHUB_TOKEN="$(cat ./tools/TOKEN.txt)"
export DOCKER_PASS="$(cat ./tools/DOCKERPASS.txt)"

SSH_CMD="ssh -q -o HostKeyAlgorithms=ssh-rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
SCP_CMD="scp -qpr -o HostKeyAlgorithms=ssh-rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

function printDots() {
    text=$1
    length=$2
    textlen=${#text}

    newlength=$((length - textlen - 1))

    v=$(printf "%-${newlength}s" ".")
    echo -en "${text} ${v// /.} "
}
