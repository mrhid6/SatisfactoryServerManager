export GITHUB_TOKEN="666c6a35cc468bcd104ee7d1be0f1621a64b81c6"

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
