export GITHUB_TOKEN="d6bf6b961049d0fa8d9e3536446805c136e57ae5"

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
