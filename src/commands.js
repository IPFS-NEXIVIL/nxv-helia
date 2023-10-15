import moment from "moment";
import { bootupNode, findPeer, subscribe } from "./helia";
import { multiaddr } from "@multiformats/multiaddr";
let nn, textLoop, cid, serverAddr, iotMultiaddr;
export default function setup(term) {
  return {
    connect: {
      f: async ({ cid: _cid, addr }) => {
        term.write("\r\nBootup IPFS Node...\r\n");
        serverAddr = addr;
        const node = await bootupNode(addr);
        nn = node;

        term.write(`\r\nConnecting to ${node.libp2p.peerId}...\r\n`);

        if (!!_cid) {
          console.log(_cid);
          cid = _cid;
          await new Promise((r) => {
            setTimeout(r, 5000);
          });
          term.write("\r\nFind Node...\r\n");
          iotMultiaddr = await findPeer(node, _cid);
        }

        term.prompt();
      },
      description: "connection Test",
    },
    start: {
      f: () => {
        term.write("\r\nSubscribe Network Events...\r\n");
        const [buffer, func, result] = subscribe(nn, cid);
        let text, pid;
        function loop() {
          text = buffer.shift();

          if (text) term.write(`\r\n${text}`);
          pid = requestAnimationFrame(loop);
        }
        pid = requestAnimationFrame(loop);
        func().then(() => {
          cancelAnimationFrame(pid);
          term.write(`${result.join("\n\r")}`);
          term.prompt();
        });
      },
      description: "",
    },
    find: {
      f: async ({ cid }) => {
        if (!!cid) {
          await new Promise((r) => {
            setTimeout(r, 5000);
          });
          console.log(cid);
          term.write("\r\nFind Node...\r\n");
          await findPeer(nn, cid);
        }
        term.prompt();
      },
      description: "connection Test",
    },
    pub: {
      f: ({ m }) => {
        console.log(m);
        nn.libp2p.services.pubsub.publish(
          cid,
          new TextEncoder().encode("banana")
        );
      },
      description: "connection Test",
    },
    stop: {
      f: () => {
        cancelAnimationFrame(textLoop);
      },
      description: "",
    },
    peers: {
      f: () => {
        console.log(
          nn.libp2p.getPeers(),
          nn.libp2p.getConnections().map((i) => `${i.remoteAddr}`)
        );
      },
      description: "",
    },
    failover: {
      f: async () => {
        term.write("\r\nHangup Nexivil Relay Server.");
        await nn.libp2p.hangUp(multiaddr(serverAddr));
        await nn.libp2p.hangUp(iotMultiaddr);
        term.write(`\r\nFind "${cid}" Node`);
        let nowtime = moment();
        term.write(`\r\nStart Time: ${nowtime.format("hh:mm:ss.sss")}`);
        iotMultiaddr = await findPeer(nn, cid);
        // for (let m of iotMultiaddr) {
        //   if (m.getPeerId() !== cid) continue;
        //   await nn.libp2p.dial(m);
        // }
        let endtime = moment();
        term.write(`\r\nEnd Time: ${endtime.format("hh:mm:ss.sss")}\r\n`);

        term.write(`\r\nDuration: ${endtime.diff(nowtime) / 1000}\r\n`);
        term.prompt();
      },
    },
  };
}
