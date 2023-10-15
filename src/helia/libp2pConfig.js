import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { bootstrap } from "@libp2p/bootstrap";
import { ipniContentRouting } from "@libp2p/ipni-content-routing";
import { kadDHT } from "@libp2p/kad-dht";
import { mplex } from "@libp2p/mplex";
import { webRTC, webRTCDirect } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";
import { all as wsAll } from "@libp2p/websockets/filters";
// import { webTransport } from "@libp2p/webtransport";
import { ipnsSelector } from "ipns/selector";
import { ipnsValidator } from "ipns/validator";
import { autoNATService } from "libp2p/autonat";
import { circuitRelayTransport } from "libp2p/circuit-relay";
import { identifyService } from "libp2p/identify";
import { delegatedContentRouting } from "@libp2p/delegated-content-routing";
// import { delegatedPeerRouting } from "@libp2p/delegated-peer-routing";
import { create as createKuboRpcClient } from "kubo-rpc-client";
// import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";
import { webRTCStar } from "@libp2p/webrtc-star";
import { pingService } from "libp2p/ping";
import { webTransport } from "@libp2p/webtransport";
import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";

// const star = webRTCStar();
export function libp2pDefaults(addr) {
  return {
    addresses: {
      listen: [
        // "/dns4/libp2p.nexivil.com/udp/4001/quic-v1/webtransport/",
        // "/webtransport"
        "/webrtc",
        "/wss",
        "/ws",
        // "/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star",
        // "/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star",
        // "/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star",
        // "/dns4/libp2p-rdv.vps.revolunet.com/tcp/443/wss/p2p-webrtc-star",
      ],
    },
    transports: [
      webSockets({ filter: wsAll }),
      webRTC(),
      webRTCDirect(),
      webTransport(),
      circuitRelayTransport({
        discoverRelays: 3,
      }),
      // star.transport,
      // webTransport(),
    ],
    streamMuxers: [yamux(), mplex()],
    // peerRouters: [
    //   delegatedPeerRouting(
    //     createKuboRpcClient({
    //       protocol: "http",
    //       port: 8080,
    //       host: "localhost",
    //     })
    //   ),
    // ],
    connectionGater: {
      denyDialMultiaddr: async () => false,
    },
    connectionEncryption: [noise()],
    connectionManager: {
      maxConnections: 15,
      minConnections: 2,
    },
    peerDiscovery: [
      // pubsubPeerDiscovery({ interval: 1000 }),
      bootstrap({
        list: [
          // "/ip4/127.0.0.1/tcp/62000/ws/p2p/12D3KooWMBHbd4HrEdh7aKMNzpZHURgjMowdZvCjDMSnnfsN385A",
          // "/ip4/192.168.1.38/tcp/61999/p2p/12D3KooWMBHbd4HrEdh7aKMNzpZHURgjMowdZvCjDMSnnfsN385A",
          // "/ip4/192.168.1.38/tcp/62000/ws/p2p/12D3KooWMBHbd4HrEdh7aKMNzpZHURgjMowdZvCjDMSnnfsN385A",
          // "/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
          "/dnsaddr/node-1.ingress.cloudflare-ipfs.com/p2p/QmcFf2FH3CEgTNHeMRGhN7HNHU1EXAxoEk6EFuSyXCsvRE",
          // "/ip4/192.168.1.165/tcp/4002/ws/p2p/12D3KooWJvMFqsvvSojDmBeffhQFfRPNQRCmErvbYFsN89i5Czwy",
          "/dns4/hoverboard-staging.dag.haus/tcp/443/wss/p2p/Qmc5vg9zuLYvDR1wtYHCaxjBHenfCNautRwCjG3n5v5fbs",
          addr,
        ],
      }),
      // pubsubPeerDiscovery(),
    ],
    // contentRouters: [ipniContentRouting("http://localhost:6004")],
    contentRouters: [
      ipniContentRouting("https://cid.contact"),
      // delegatedContentRouting(
      //   createKuboRpcClient({
      //     protocol: "http",
      //     port: 8080,
      //     host: "localhost",
      //   })
      // ),
      delegatedContentRouting(
        createKuboRpcClient({
          protocol: "https",
          port: 443,
          host: "node0.delegate.ipfs.io",
        })
      ),
    ],
    relay: {
      enabled: true,
      hop: {
        enabled: true,
      },
    },
    services: {
      identify: identifyService(),
      autoNAT: autoNATService(),
      pubsub: gossipsub({
        enabled: true,
        allowPublishToZeroPeers: true,
        // allowedTopics: ["fruits"],
        // Dscore: 1,
        emitSelf: true,
        // canRelayMessage: true,
      }),
      dht: kadDHT({
        clientMode: true,
        validators: {
          ipns: ipnsValidator,
        },
        selectors: {
          ipns: ipnsSelector,
        },
      }),
      ping: pingService(),
    },
  };
}
