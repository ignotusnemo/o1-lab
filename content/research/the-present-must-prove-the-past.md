# **The Present Must Prove the Past**

### *Can a blockchain validate its current state without replaying the entire execution history from genesis?*

A new node can be handed a perfectly well-formed snapshot of a blockchain. Every record may decode correctly, every commitment may match, and the data may be internally consistent in every obvious way. None of that answers the question that matters: **why should this state be accepted as the result of the chain?**

Bitcoin answers by reconstructing it. Start at genesis, verify the chain, execute every transaction, and derive the current UTXO set yourself. The evidence for the present lives in the past. Snapshots can make that process faster, checkpoints can move the starting point, and specialized infrastructure can perform the historical work elsewhere. But the state in front of you still does not prove that it was reached through a valid sequence of transitions from genesis.

That was the relationship I wanted to invert. The interesting question was not simply whether blockchain history could be compressed into a recursive proof. It was this:

**What if the validity of the current state were itself something consensus carried forward?**

Then a new node could receive the current state together with proof of the valid path that produced it. It would not need to replay the network's lifetime execution just to establish why the present is valid. The expensive part of state validation would no longer grow simply because the chain had grown older. The work required to authenticate the present would be tied to what exists now, rather than to every transaction the network has ever processed.

## Carrying validity forward

Let \(S_h\) denote the state after block \(h\), and let \(\pi_h\) denote the proof associated with that state.

For each new block, the proof must establish two facts:

```text
1. π_(h-1) is valid

2. applying block B_h to state S_(h-1)
   produces exactly state S_h
```

The result is a new proof, \(\pi_h\):

```text
(S_(h-1), π_(h-1)) + B_h
            |
            v
      prove transition
            |
            v
        (S_h, π_h)
```

Each proof verifies the previous proof and incorporates one more transition. At block height ten million, the proof does not contain ten million separate proofs. Its shape remains fixed as the chain grows. Transition validity moves forward recursively.

That leads to an important consensus question:

**When does the proof become authoritative?**

If \(\pi_h\) is the reason \(S_h\) is accepted as valid, then the proof cannot be an auxiliary certificate produced sometime after the block. The justification for accepting a state must exist at the moment the state enters consensus.

Otherwise the protocol ends up with two independent tips:

```text
accepted block tip      --------------->

proven state tip        ---------->
```

The gap between them now needs its own semantics. What does an unproven tip mean? Which tip is authoritative? What survives a crash? How does proving resume?

The cleaner rule is atomic acceptance:

```text
accepted block = block + recursive proof
```

A new state enters consensus together with the proof of the transition that created it. State and proof advance together, so consensus has a single notion of progress.

The recursive proof is no longer a separate certificate about history.

**It carries the reason the state is valid from one block into the next.**

Once historical execution no longer serves that purpose, the role of history itself begins to change.

## What is history still for?

If the current state already carries a recursive proof of valid ancestry, a new node no longer needs historical block bodies to establish the validity of the present.

That does not make the past irrelevant. Sometimes what matters is **one particular event that happened earlier**.

Suppose I make a payment and later need to prove that the network accepted it. I can keep the transaction and its Merkle path. Together, they let me reconstruct the block's `transaction root` and prove that the transaction was included in that block.

One fact is still missing.

A block can be valid, propagate across the network, and still lose to a competing branch. Inclusion in a block is not the same as inclusion in the canonical chain.

A payment proof therefore needs to answer two questions:

```text
Was this transaction included in this block?

Was this block part of the canonical chain?
```

The transaction and its Merkle path answer the first question.

We could make the recursive proof commit to an authenticated block history that supports openings at arbitrary heights, but there is no reason to give it that job.

**Block headers are compact enough to retain permanently. The header chain preserves the canonical spine and lets a node determine whether a particular block belongs to it.**

The two pieces now have distinct roles.

The transaction and Merkle path prove:

```text
this transaction was included in this block
```

The verified header chain establishes:

```text
this block belongs to the current canonical chain
```

Together they form a compact, portable proof of payment: a **payment receipt**.

```text
transaction + Merkle path
            |
            v
      transaction root
            |
            v
       block header
            |
            v
canonical header chain
```

The full block body is no longer needed to verify that payment.

Not every node needs to retain every transaction forever just so that someone can prove one transaction later. The party that needs proof of a particular payment keeps the receipt for that payment.

The recent past is different. Near the tip, the canonical branch can still change, so nodes need a bounded window of recent full blocks to handle competing branches and shallow reorganizations. That is a working set, not the lifetime history of the network.

The different pieces now have different jobs:

| Retained data | Purpose |
|---|---|
| Current state + recursive proof | Establish current-state validity from genesis |
| Permanent compact headers | Preserve the canonical spine and historical anchors |
| Recent full blocks | Handle recent competing branches |
| Payment receipt | Prove a specific transaction without requiring the full block body |

History has not disappeared. It has been separated by purpose. A verifier no longer has to treat the network's lifetime execution as one enormous object that must be stored and replayed forever.

## State only needs to represent what exists now

The same reasoning changes how the active state can be represented.

A UTXO system does not need every output that ever existed to validate the next transition. It needs the outputs that exist and remain spendable **now**.

The active state can therefore represent the live UTXO set. Spent outputs leave it. Freed capacity can be reused. Empty regions do not need to consume physical storage.

**The size of the state a node must maintain is driven by current network use, not accumulated history.**

It depends on the live set and the capacity the network currently needs, not on the total number of transactions processed over the network's lifetime.

Chain age no longer has to imply more historical execution to replay or more dead state to retain.

One fundamental blockchain problem remains.

## Validity does not choose a winner

A recursive proof can establish that a state transition is valid.

It cannot choose between two transitions that are both valid.

Suppose two producers build different child states from the same parent. Both transitions are correct. Both blocks carry valid proofs.

Which one becomes canonical?

That is an ordering problem, not a validity problem.

**This is exactly what proof of work is for.**

The proof has already established validity. PoW gives competing valid branches an objectively comparable measure of accumulated work and lets the network converge on a canonical chain.

The division of responsibility is simple:

```text
proof -> is this transition valid?

PoW   -> which valid transition becomes canonical?
```

That separation also changes how a block is produced.

First build the transition. Then prove it. Once everything consensus-relevant except the nonce is fixed, nonce search begins.

```text
build transition
       |
       v
prove transition
       |
       v
freeze block template
       |
       v
search nonce
```

The nonce is deliberately excluded from the statement covered by the recursive proof. Mining can vary the nonce without changing anything that has already been proved.

A winning nonce completes the same block template whose transition has already been established as valid.

Hashpower cannot make an invalid state transition valid. It cannot repair an invalid transaction. It cannot rescue a broken proof.

**Hashpower establishes canonical order among transitions that are already valid.**

That canonical choice is recorded in the permanent header chain, which also gives payment receipts their canonical anchor.

This separates block production from raw hashing without separating proving from block production.

**The block producer is the prover.** It must track the current state, construct the next transition, and produce the recursive proof before nonce search can begin. There is no independent prover that certifies the block later.

In the production path, only the mechanical nonce search can be separated out as a delegated role. External workers, pools, or specialized hardware can receive an immutable, already-proved block template and search for a nonce. They cannot change the transition, repair an invalid block, or produce a different state.

**The producer proves the transition. Hashpower only competes to make the resulting block canonical.**

## The hard part is proving

Up to this point, the problem has mostly been architectural.

Once a recursive proof becomes mandatory for every block, the problem becomes computational. The proof is not an occasional checkpoint, and it is not produced after the fact. The next state cannot enter consensus without it.

The practical question is no longer whether recursive proving is possible.

**For proof-native block production, the bottleneck is proving, not verification.**

If every block requires a recursive proof, an independent miner must be able to construct that proof within the block interval on commodity hardware. If block production requires an expensive proving cluster, we have simply moved the centralization problem somewhere else.

Cheap verification is not enough. The producer has to build the proof on the critical path of every block, with a memory footprint that does not turn independent production into a data-center job.

That performance constraint shapes the proof-system engineering. But before optimizing the prover, there is a more fundamental choice to make: what cryptographic assumptions should carry the validity of the chain from genesis?

## What cryptography should the present rest on?

The architecture has already narrowed the search space. The proof system must support recursion. Its proof shape cannot grow with chain height. Proving must be fast and memory-efficient enough for independent block production on commodity hardware. Recursive verification must remain practical regardless of network age.

At this point, I want to make two more requirements explicit.

The first is transparency:

**No trusted setup.**

The second is stronger:

**End-to-end post-quantum soundness from genesis.**

The recursive proof is what lets a node accept the current state as the result of a valid chain of transitions from genesis. That makes the relevant security property much broader than whether individual components are post-quantum.

A quantum adversary may try to forge an authorization, a transition, an ancestor proof, or the terminal proof itself. The soundness claim has to cover the whole path and the final acceptance event: can any such forgery cause a node to accept an invalid current state as validly descended from genesis?

That is the requirement.

```text
recursive from genesis
fixed proof shape as the chain grows
practical proving on commodity hardware
low enough memory for independent block production
practical verification
transparent, no trusted setup
end-to-end post-quantum soundness from genesis
```

Those constraints drove the cryptographic stack.

The committed arithmetic runs over binary fields, primarily `GF(2^128)`. Security-critical challenges and recursive authentication use `GF(2^256)`. Poseidon2b is the common permutation throughout the consensus proof system.

**Minimum proof size is not the goal.**

Recursive systems built on elliptic-curve groups and discrete-log assumptions can produce dramatically smaller proofs. That is a reasonable engineering choice when end-to-end post-quantum soundness from genesis is not required.

But they cannot provide end-to-end post-quantum soundness for the recursive validity path from genesis. If curve-based assumptions sit inside that path, removing them later would mean replacing the foundations of recursion itself, together with the commitments and consensus relations built around them.

**That kind of cryptographic debt was unacceptable to us from the very first block.**

## The new architecture became Parano1d

**Parano1d** is a proof-native Layer 1 built around this architecture. In the protocol, the current consensus state is State, an exact sparse vector of live UTXOs together with consensus counters. The per-block recursive proof is HistoryStep. Each HistoryStep proves the exact transition for its block and verifies the previous HistoryStep within the same relation.

A block is accepted only with its matching terminal:

```text
{block, HistoryStep}
```

A node keeps the current `State`, the permanent compact header chain, and a bounded suffix of recent full blocks. The recursive proof establishes transition validity, while the node verifies proof-of-work ordering and cumulative work from the header chain. Older block bodies are not part of active validation.

Payments can be preserved as portable receipts. Spent capacity can be reused. Empty regions require no persistent storage.

Nonce search begins only after the nonce-independent block proof is complete.

The production path is:

```text
current State
     +
transactions
     +
previous HistoryStep
          |
          v
   prove exact transition
          |
          v
    new HistoryStep
          |
          v
 immutable block template
          |
          v
     nonce search
          |
          v
 {block, HistoryStep}
          |
          v
     full nodes verify
          |
          v
 materialize proven writes
```

| Parameter | Value |
|---|---:|
| Committed trace field | `GF(2^128)` |
| Wide challenge field | `GF(2^256)` |
| Challenge support | `2^255` |
| Poseidon2b | width 4 · rate 2 · `x^7` · 8 full rounds · 58 partial rounds |
| Wallet queries | 65 |
| HistoryStep / BaseFold queries | 133 |
| **Proof classes** | |
| B25 geometry | `m = 22` · up to 25 positions |
| B25 codeword | `2^19` at rate `1/4` |
| B255 geometry | `m = 24` · up to 255 positions |
| B255 codeword | `2^21` at rate `1/4` |

## Proving State validity from genesis in 10.7 seconds on a laptop

Parano1d targets a mean block interval of **20 seconds**. That makes proving time a consensus-level engineering constraint: an independent producer has to construct the recursive proof quickly enough to stay competitive without relying on a dedicated proving cluster.

**Each new `HistoryStep` is a complete proof of `State` validity from genesis through the current block.**

Past transitions are not rebuilt. The new proof recursively verifies the preceding `HistoryStep` and directly proves everything introduced by the current block. In a single proving pass, the producer:

- decodes and binds the preceding terminal, recursively verifies the previous `HistoryStep`, and carries the entire proven transition path from genesis forward;
- proves the canonical block-body structure: every consensus-derived system record, the complete physical page stream, and its grouping into logical `PagedSpend` transactions;
- verifies the fresh authorization capsule for every logical user transaction, binding its transaction ID and input owner;
- proves the inclusion of every logical transaction and its epoch anchor in the fixed 256-leaf Merkle tree, then binds the `transaction root` to the nonce-independent block template;
- proves that every input matches a live UTXO in the parent `State`, every output targets an empty slot, and no conflicts exist among inputs and outputs inside the block;
- proves value conservation and the complete monetary arithmetic: minimum fees, deterministic burn, claimable fees, and the miner reward;
- proves the exact spend and mint actions, deterministic slot allocation, the active-slot count, and the allocation counter;
- proves any permitted `State` growth, every affected segment root, and the resulting global `State` root, then binds the child header and accumulator to the parent boundary;
- produces the next terminal, which every full node verifies together with the block.

Only after that complete block transition has been proved does nonce search begin.

Within this full construction, one of the largest costs was Poseidon2b.

The same permutation appears throughout `State` commitments, Merkle relations, transaction commitments, proof transcripts, and recursive verification. If every invocation is proved as a separate constraint chain, the prover repeats essentially the same algebraic work thousands of times.

The inputs change. The connections between invocations change. The permutation itself does not.

So I changed the representation.

Instead of treating those executions as separate copies, I put every Poseidon2b execution in a batch into one global trace indexed by:

```text
permutation slot × round × state lane
```

The proof establishes the permutation semantics across the entire batch. Separate relations connect each execution back to the places where its inputs and outputs matter.

I call this construction **FROST-GKR**, short for **Frobenius Reduction over Shifted Tables**.

On a reference workload containing 59 Poseidon2b permutations:

| Metric | Previous construction | FROST-GKR |
|---|---:|---:|
| Constraint sumchecks | 472 | 2 |
| Raw algebraic transcript | 287,712 bytes | 5,568 bytes |
| Reduction prover speedup | 1.00× | 10.69× |

These are reduction-level results, not a claim of a 10.69× end-to-end `HistoryStep` speedup. The [FROST-GKR paper](https://lab.parano1d.org/papers/FROST_GKR.pdf) and [reference artifact](https://github.com/ignotusnemo/frost-gkr) contain the full benchmark boundary and measurement record.

Parano1d has two production proof classes. B25 is the standard block-production profile. B255 uses a larger authenticated matrix and larger block geometry. Both classes are consensus-valid and handled by the same production verifier.

With that construction in the production prover, the measured `HistoryStep` times are:

| Host | Class | Proving time | Statistic | Terminal |
|---|---|---:|---|---:|
| 12-thread AVX2 laptop | B25 | 10.734 s | p50 of 3 runs | 971,732 bytes |
| 12-thread AVX2 laptop | B255 | 34.938 s | 1 isolated run | 1,081,108 bytes |
| 24-thread AVX-512 PC | B25 | 6.905 s | p50 of 3 runs | 971,732 bytes |
| 24-thread AVX-512 PC | B255 | 21.053 s | p50 of 3 runs | 1,081,108 bytes |

The B25 laptop result is the one that matters for the default production path: **10.734 seconds p50 on commodity hardware against a 20-second mean block target.**

The benchmark measures `HistoryStep` construction, not complete mining latency. The exact timing boundary and reproduction methodology are published in the [performance record](https://docs.parano1d.org/reference/performance).

## What does end-to-end post-quantum soundness from genesis mean?

Calling a collection of primitives post-quantum does not establish end-to-end soundness.

The security question is concrete:

**Can a quantum adversary forge validity anywhere in the represented ancestry and still cause a node to accept an invalid current `State` as valid from genesis?**

That is the failure event.

The attack does not have to target the latest `HistoryStep`. It may begin deeper in the represented ancestry and try to carry a false claim forward through later recursive proofs. The theorem therefore has to cover every component on which final acceptance depends:

```text
transaction authorization
block relation
parent continuity
exact State transition
recursive verification
proof commitments
Fiat-Shamir challenges
represented ancestors
```

The claim is not scoped to one signature scheme, one hash function, one proof component, or one block height.

It is scoped to **the current `State` the network accepts as valid from genesis**.

The production profile has two published analyses, and they answer different questions.

The classical [Block-Tiwari FS-FRI analysis](https://lab.parano1d.org/research/parano1d-block-tiwari-fs-fri/) gives:

```text
127 provable bits
127 conjectured bits
```

against a 128-bit target.

[A separate executable theorem in the quantum random-oracle model](https://lab.parano1d.org/research/parano1d-nist-pqc-category-one/) considers the full invalid-`State` game from genesis against one stateful quantum adversary. It accounts for the represented ancestry under a single adversarial resource budget.

Its production Category 1 conclusion has two explicit premises. The fixed production Poseidon2b compiler must satisfy:

```text
Delta_P2b^C1 < 0.446635859676391589
```

The theorem's stated lower bound on the logical gate and depth cost of coherent oracle responses must also hold.

Inside the ideal model, the dominant half-success gate-depth floor is:

```text
2^173.273866314232
```

The [NIST AES-128 Category 1 reference](https://csrc.nist.gov/projects/post-quantum-cryptography/post-quantum-cryptography-standardization/evaluation-criteria/security-%28evaluation-criteria%29) in the same depth-aware model is:

```text
2^170
```

The complete ideal success bound inside the Category 1 envelope is:

```text
0.053364140323608411 < 1/2
```

Under the two stated premises, adding the fixed-Poseidon2b headroom keeps the complete production success probability below `1/2` throughout the Category 1 resource envelope. The full theorem, assumptions, source-linked production parameters, and executable arithmetic are published in the [`noid_soundness` certificate](https://github.com/ignotusnemo/parano1d/tree/main/noid_soundness) inside the Parano1d repository.

The numbers matter.
The scope matters more.

Not a signature.
Not a hash.
Not one proof component.
Not one point in the chain.

**The current state the network accepts as valid from genesis.**

That is what end-to-end means here.

## Parano1d's main result

Parano1d has moved the source of current-state validity out of accumulated execution history into the present itself.

The entire validity path from genesis is backed by an executable end-to-end post-quantum soundness theorem at the NIST Category 1 resource threshold.

We changed the role of history in a blockchain.

**The present must prove the past.**

**Now it does.**

[parano1d.org](https://parano1d.org)
